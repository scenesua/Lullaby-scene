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
import kotlin.math.PI
import kotlin.math.sin

/**
 * Service-owned living-scene runtime. The selected duration is the entire journey,
 * while aircraft phases use absolute-time windows and cruise stretches to fill the
 * remaining sleep time. Random events are independently scheduled inside cruise.
 */
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

        engine.applyMix(
            MixState(
                masterVolume = 0.8f,
                masterMuted = false,
                sources = mapOf(
                    SOURCE_AIRCRAFT to SourceState(SOURCE_AIRCRAFT, enabled = true, volume = 0.68f),
                    SOURCE_VENTILATION to SourceState(SOURCE_VENTILATION, enabled = isSourceAvailable(SOURCE_VENTILATION), volume = if (isSourceAvailable(SOURCE_VENTILATION)) 0.18f else 0f),
                    SOURCE_BROWN_NOISE to SourceState(SOURCE_BROWN_NOISE, enabled = isSourceAvailable(SOURCE_BROWN_NOISE), volume = if (isSourceAvailable(SOURCE_BROWN_NOISE)) 0.10f else 0f),
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

    /** Change the whole journey length without restarting the current journey. */
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
        if (isSourceAvailable(SOURCE_VENTILATION)) setVolumeIfChanged(SOURCE_VENTILATION, frame.ventilationVolume)
        if (isSourceAvailable(SOURCE_BROWN_NOISE)) setVolumeIfChanged(SOURCE_BROWN_NOISE, frame.rumbleVolume)
        applySceneDsp(current.macros, phase, activeEvent)
    }

    private fun setVolumeIfChanged(sourceId: String, volume: Float) {
        val current = engine.snapshot().sources[sourceId]?.volume ?: -1f
        if (kotlin.math.abs(current - volume) >= 0.006f) {
            engine.setSourceVolume(sourceId, volume.coerceIn(0f, 1f))
        }
    }

    /**
     * Spatial/DSP v1. User semantic controls remain the baseline; timed flight
     * phases and short scheduled events temporarily bias the same acoustic model.
     */
    private fun applySceneDsp(
        macros: SceneMacroState,
        phase: String,
        event: AircraftJourneyEvent?,
    ) {
        val user = eqSettingsProvider()
        val count = maxOf(5, user.bands.size)
        val bands = MutableList(count) { index -> if (user.enabled) user.bands.getOrElse(index) { 0 } else 0 }
        val phaseEngineBoost = when (phase) {
            STATE_TAKEOFF -> 0.24f
            STATE_CLIMB -> 0.14f
            STATE_DESCENT -> 0.06f
            STATE_APPROACH -> 0.10f
            else -> 0f
        }
        val eventTurbulence = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_TURBULENCE) event.intensity else 0f
        val effectivePresence = (macros.enginePresence + phaseEngineBoost).coerceIn(0f, 1f)
        val effectiveTurbulence = (macros.turbulence + eventTurbulence).coerceIn(0f, 1f)
        val distance = 1f - effectivePresence
        val highCut = (450f + 950f * distance + 650f * macros.nightDepth).toInt()
        val upperMidCut = (highCut * 0.52f).toInt()
        val lowBody = (180f * effectiveTurbulence + 130f * phaseEngineBoost).toInt()
        bands[0] = (bands[0] + lowBody).coerceIn(-1500, 1500)
        if (count >= 2) bands[count - 2] = (bands[count - 2] - upperMidCut).coerceIn(-1500, 1500)
        bands[count - 1] = (bands[count - 1] - highCut).coerceIn(-1500, 1500)
        engine.applyEqualizer(true, "scene_aircraft_spatial", bands)
    }

    private fun restoreUserEq() {
        val user = eqSettingsProvider()
        engine.applyEqualizer(user.enabled, user.presetName, user.bands)
    }

    private data class AircraftFrame(
        val aircraftVolume: Float,
        val ventilationVolume: Float,
        val rumbleVolume: Float,
    )

    private fun passengerAircraftFrame(
        snapshot: SceneRuntimeSnapshot,
        phase: String,
        event: AircraftJourneyEvent?,
    ): AircraftFrame {
        val phaseDetail = when (phase) {
            STATE_TAXI_OUT -> 0.82f
            STATE_TAKEOFF -> 1.18f
            STATE_CLIMB -> 1.10f
            STATE_CRUISE -> 1.00f
            STATE_DESCENT -> 0.96f
            STATE_APPROACH -> 1.03f
            STATE_TAXI_IN -> 0.80f
            else -> 0.65f
        }
        val phaseVent = when (phase) {
            STATE_TAKEOFF, STATE_CLIMB -> 0.86f
            STATE_CRUISE -> 1.00f
            STATE_DESCENT, STATE_APPROACH -> 0.94f
            else -> 0.90f
        }
        val m = snapshot.macros
        val eventTurbulence = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_TURBULENCE) event.intensity else 0f
        val eventCabin = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_CABIN_ACTIVITY) event.intensity else 0f
        val effectiveTurbulence = (m.turbulence + eventTurbulence).coerceIn(0f, 1f)
        val effectiveCabin = (m.cabinActivity + eventCabin).coerceIn(0f, 1f)
        val spatial = 0.78f + 0.22f * m.enginePresence
        val detail = 0.74f + 0.34f * effectiveCabin
        val turbulenceWave = 1f + (0.045f * effectiveTurbulence * sin((snapshot.elapsedMs / 2200.0) * 2.0 * PI).toFloat())
        val aircraft = (0.68f * phaseDetail * spatial * detail * turbulenceWave).coerceIn(0.22f, 0.92f)
        val ventilation = (0.17f * phaseVent * (0.92f + 0.15f * m.nightDepth)).coerceIn(0.08f, 0.26f)
        val phaseRumble = when (phase) {
            STATE_TAKEOFF -> 0.10f
            STATE_CLIMB -> 0.06f
            STATE_APPROACH -> 0.03f
            else -> 0f
        }
        val rumble = (0.07f + 0.10f * m.enginePresence + 0.035f * effectiveTurbulence + phaseRumble).coerceIn(0.04f, 0.28f)
        return AircraftFrame(aircraft, ventilation, rumble)
    }

    companion object {
        const val PASSENGER_AIRCRAFT = "passenger_aircraft_cabin"
        const val SOURCE_AIRCRAFT = "aircraft_cabin"
        const val SOURCE_VENTILATION = "ventilation"
        const val SOURCE_BROWN_NOISE = "brown_noise"

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
