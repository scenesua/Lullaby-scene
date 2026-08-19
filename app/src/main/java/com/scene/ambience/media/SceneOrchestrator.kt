package com.scene.ambience.media

import com.scene.ambience.data.model.EqSettings
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.data.model.SceneMacroState
import com.scene.ambience.data.model.SceneRuntimeSnapshot
import com.scene.ambience.data.model.SourceState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Service-owned living-scene runtime. */
class SceneOrchestrator(
    private val engine: AmbienceEngine,
    private val scope: CoroutineScope,
    private val eqSettingsProvider: () -> EqSettings,
    private val isSourceAvailable: (String) -> Boolean,
) {
    private val _state = MutableStateFlow(SceneRuntimeSnapshot())
    val state: StateFlow<SceneRuntimeSnapshot> = _state.asStateFlow()

    private var job: Job? = null
    private var timeline: AircraftJourneyTimeline? = null
    private var scheduleSeed: Long = 0L

    fun start(sceneId: String, totalDurationMinutes: Int): Boolean {
        if (sceneId != PASSENGER_AIRCRAFT || !isSourceAvailable(SOURCE_AIRCRAFT)) return false

        job?.cancel()
        scheduleSeed = System.currentTimeMillis() xor System.nanoTime()
        val duration = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(totalDurationMinutes)
        timeline = AircraftJourneyTimelineBuilder.build(duration, scheduleSeed)
        _state.value = SceneRuntimeSnapshot(
            sceneId = PASSENGER_AIRCRAFT,
            stateId = STATE_TAXI_OUT,
            totalDurationMinutes = duration,
            elapsedMs = 0L,
            seatbeltSignOn = true,
            macros = SceneMacroState(),
        )

        // Keep the journey path deliberately simple: the verified stereo cabin
        // field recording is the audible bed. Do not layer ventilation, synthetic
        // rumble, widening or other broadband noise over it; those layers made
        // narrow recording tones and codec artefacts much easier to hear.
        engine.applyMix(
            MixState(
                masterVolume = 0.8f,
                masterMuted = false,
                sources = mapOf(
                    SOURCE_AIRCRAFT to SourceState(
                        SOURCE_AIRCRAFT,
                        enabled = true,
                        volume = 0.62f,
                    ),
                ),
            ),
            presetId = null,
        )
        applyFrame()
        engine.play()
        job = scope.launch { runSceneClock() }
        return true
    }

    fun stopScene() {
        job?.cancel()
        job = null
        timeline = null
        _state.value = SceneRuntimeSnapshot()
        restoreUserEq()
    }

    fun release() = stopScene()

    fun setDurationMinutes(minutes: Int) {
        val current = _state.value
        if (!current.active) return
        val duration = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(minutes)
        val rebuilt = AircraftJourneyTimelineBuilder.build(duration, scheduleSeed)
        timeline = rebuilt
        _state.value = current.copy(
            totalDurationMinutes = duration,
            elapsedMs = current.elapsedMs.coerceAtMost(rebuilt.journeyEndMs),
        )
        applyFrame()
    }

    /** Move the living-scene clock without restarting the audio bed. */
    fun seekToElapsedMs(elapsedMs: Long) {
        val current = _state.value
        val plan = timeline ?: return
        if (!current.active) return
        val target = elapsedMs.coerceIn(0L, plan.journeyEndMs)
        _state.value = current.copy(elapsedMs = target)
        applyFrame()
        if (target >= plan.journeyEndMs) engine.stop()
    }

    fun stepPhase(direction: Int) {
        val current = _state.value
        val plan = timeline ?: return
        if (!current.active) return
        val phases = listOf(
            STATE_TAXI_OUT to 0L,
            STATE_TAKEOFF to plan.taxiOutEndMs,
            STATE_CLIMB to plan.takeoffEndMs,
            STATE_CRUISE to plan.climbEndMs,
            STATE_DESCENT to plan.descentStartMs,
            STATE_APPROACH to plan.approachStartMs,
            STATE_TAXI_IN to plan.touchdownMs,
            STATE_ARRIVED to plan.journeyEndMs,
        )
        val phase = plan.phaseAt(current.elapsedMs)
        val index = phases.indexOfFirst { it.first == phase }.coerceAtLeast(0)
        val targetIndex = (index + if (direction < 0) -1 else 1).coerceIn(0, phases.lastIndex)
        seekToElapsedMs(phases[targetIndex].second)
    }

    fun setMacro(key: String, value: Float) {
        val current = _state.value
        if (!current.active) return
        val v = value.coerceIn(0f, 1f)
        val m = current.macros
        val next = when (key) {
            MACRO_ENGINE_PRESENCE -> m.copy(enginePresence = v)
            MACRO_CABIN_ACTIVITY -> m.copy(cabinActivity = v)
            MACRO_TURBULENCE -> m.copy(turbulence = v)
            MACRO_NIGHT_DEPTH -> m.copy(nightDepth = v)
            else -> return
        }
        _state.value = current.copy(macros = next)
        applyFrame()
    }

    private suspend fun runSceneClock() {
        while (kotlin.coroutines.coroutineContext.isActive && _state.value.active) {
            delay(TICK_MS)
            if (engine.snapshot().playbackState != PlaybackState.PLAYING) continue
            val plan = timeline ?: return
            val current = _state.value
            val elapsed = (current.elapsedMs + TICK_MS).coerceAtMost(plan.journeyEndMs)
            _state.value = current.copy(elapsedMs = elapsed)
            applyFrame()
            if (elapsed >= plan.journeyEndMs) {
                engine.stop()
                return
            }
        }
    }

    private fun applyFrame() {
        val current = _state.value
        if (current.sceneId != PASSENGER_AIRCRAFT) return
        val plan = timeline ?: return
        val phase = plan.phaseAt(current.elapsedMs)
        val activeEvent = plan.activeEventsAt(current.elapsedMs).firstOrNull()
        val beltOn = plan.seatbeltSignOnAt(current.elapsedMs)
        val frame = passengerAircraftFrame(current, phase, activeEvent)

        if (phase != current.stateId || beltOn != current.seatbeltSignOn || activeEvent?.kind != current.activeEventId) {
            _state.value = current.copy(
                stateId = phase,
                seatbeltSignOn = beltOn,
                activeEventId = activeEvent?.kind,
            )
        }

        setVolumeIfChanged(SOURCE_AIRCRAFT, frame.aircraftVolume)
        applySceneDsp(current.macros, phase, activeEvent)
    }

    private fun setVolumeIfChanged(sourceId: String, volume: Float) {
        val current = engine.snapshot().sources[sourceId]?.volume ?: -1f
        if (kotlin.math.abs(current - volume) >= 0.006f) {
            engine.setSourceVolume(sourceId, volume.coerceIn(0f, 1f))
        }
    }

    /**
     * Keep phase tone changes intentionally tiny. The processed source already
     * removes the two persistent whistle bands, so scene DSP must not try to
     * manufacture a different cabin with strong EQ, modulation or widening.
     */
    private fun applySceneDsp(
        macros: SceneMacroState,
        phase: String,
        event: AircraftJourneyEvent?,
    ) {
        val user = eqSettingsProvider()
        val count = maxOf(5, user.bands.size)
        val bands = MutableList(count) { index -> if (user.enabled) user.bands.getOrElse(index) { 0 } else 0 }
        val phasePresence = when (phase) {
            STATE_TAKEOFF -> 1f
            STATE_CLIMB -> 0.55f
            STATE_DESCENT -> 0.20f
            STATE_APPROACH -> 0.25f
            else -> 0f
        }
        val turbulence = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_TURBULENCE) event.intensity else 0f
        val lowBody = (28f * phasePresence + 16f * turbulence * macros.turbulence).toInt()
        val highSoftening = (80f * macros.nightDepth + 35f * (1f - macros.enginePresence)).toInt()
        // Persistent aircraft whistle suppression is source-aware in AmbienceEngine.
        // Keep the scene scheduler limited to the very small user-controlled tone
        // changes so it does not double-cut the cabin recording.
        bands[0] = (bands[0] + lowBody).coerceIn(-1500, 1500)
        if (count >= 2) bands[count - 2] = (bands[count - 2] - highSoftening / 2).coerceIn(-1500, 1500)
        bands[count - 1] = (bands[count - 1] - highSoftening).coerceIn(-1500, 1500)
        engine.applyEqualizer(user.enabled || lowBody != 0 || highSoftening != 0, "scene_aircraft_tone", bands)
    }

    private fun restoreUserEq() {
        val user = eqSettingsProvider()
        engine.applyEqualizer(user.enabled, user.presetName, user.bands)
    }

    private data class AircraftFrame(val aircraftVolume: Float)

    private fun passengerAircraftFrame(
        snapshot: SceneRuntimeSnapshot,
        phase: String,
        event: AircraftJourneyEvent?,
    ): AircraftFrame {
        val phaseDetail = when (phase) {
            STATE_TAXI_OUT -> 0.94f
            STATE_TAKEOFF -> 1.04f
            STATE_CLIMB -> 1.02f
            STATE_CRUISE -> 1.00f
            STATE_DESCENT -> 0.99f
            STATE_APPROACH -> 1.01f
            STATE_TAXI_IN -> 0.92f
            else -> 0.70f
        }
        val m = snapshot.macros
        val eventTurbulence = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_TURBULENCE) event.intensity else 0f
        val eventCabin = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_CABIN_ACTIVITY) event.intensity else 0f
        val effectiveCabin = (m.cabinActivity + eventCabin).coerceIn(0f, 1f)
        val presence = 0.94f + 0.06f * m.enginePresence
        val detail = 0.98f + 0.03f * effectiveCabin
        val turbulenceLevel = 1f + 0.008f * (m.turbulence + eventTurbulence).coerceIn(0f, 1f)
        val aircraft = (0.62f * phaseDetail * presence * detail * turbulenceLevel).coerceIn(0.30f, 0.72f)
        return AircraftFrame(aircraft)
    }

    companion object {
        const val PASSENGER_AIRCRAFT = "passenger_aircraft_cabin"
        const val SOURCE_AIRCRAFT = "aircraft_cabin"
        const val SOURCE_VENTILATION = "ventilation" // kept for recipe/protocol compatibility

        const val MACRO_ENGINE_PRESENCE = "engine_presence"
        const val MACRO_CABIN_ACTIVITY = "cabin_activity"
        const val MACRO_TURBULENCE = "turbulence"
        const val MACRO_NIGHT_DEPTH = "night_depth"

        const val STATE_TAXI_OUT = "taxi_out"
        const val STATE_TAKEOFF = "takeoff"
        const val STATE_CLIMB = "climb"
        const val STATE_CRUISE = "cruise"
        const val STATE_DESCENT = "descent"
        const val STATE_APPROACH = "approach"
        const val STATE_TAXI_IN = "taxi_in"
        const val STATE_ARRIVED = "arrived"

        private const val TICK_MS = 1_000L
    }
}
