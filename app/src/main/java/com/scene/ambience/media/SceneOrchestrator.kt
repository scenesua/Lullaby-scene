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
 * Service-owned living-scene runtime. It deliberately sits above AmbienceEngine:
 * the existing mixer remains the stable low-level playback primitive while the
 * scene engine owns coherent source levels, timed state transitions and semantic
 * macros. This keeps scene progression alive while the Activity is backgrounded.
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

    fun start(sceneId: String, arcMinutes: Int): Boolean {
        if (sceneId != PASSENGER_AIRCRAFT || !isSourceAvailable(SOURCE_AIRCRAFT)) return false

        job?.cancel()
        val arc = normalizeArc(arcMinutes)
        _state.value = SceneRuntimeSnapshot(
            sceneId = PASSENGER_AIRCRAFT,
            stateId = STATE_SETTLING,
            arcMinutes = arc,
            elapsedMs = 0L,
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
        _state.value = SceneRuntimeSnapshot()
        restoreUserEq()
    }

    fun release() = stopScene()

    fun setArcMinutes(minutes: Int) {
        if (!_state.value.active) return
        _state.value = _state.value.copy(arcMinutes = normalizeArc(minutes), elapsedMs = 0L)
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
            val current = _state.value
            val maxElapsed = if (current.arcMinutes > 0) current.arcMinutes * 60_000L else Long.MAX_VALUE
            _state.value = current.copy(elapsedMs = (current.elapsedMs + TICK_MS).coerceAtMost(maxElapsed))
            applyFrame()
        }
    }

    private fun applyFrame() {
        val current = _state.value
        if (current.sceneId != PASSENGER_AIRCRAFT) return
        val frame = passengerAircraftFrame(current)
        if (frame.stateId != current.stateId) {
            _state.value = current.copy(stateId = frame.stateId)
        }
        setVolumeIfChanged(SOURCE_AIRCRAFT, frame.aircraftVolume)
        if (isSourceAvailable(SOURCE_VENTILATION)) setVolumeIfChanged(SOURCE_VENTILATION, frame.ventilationVolume)
        if (isSourceAvailable(SOURCE_BROWN_NOISE)) setVolumeIfChanged(SOURCE_BROWN_NOISE, frame.rumbleVolume)
        applySceneDsp(current.macros)
    }

    private fun setVolumeIfChanged(sourceId: String, volume: Float) {
        val current = engine.snapshot().sources[sourceId]?.volume ?: -1f
        if (kotlin.math.abs(current - volume) >= 0.006f) {
            engine.setSourceVolume(sourceId, volume.coerceIn(0f, 1f))
        }
    }

    /**
     * Internal spatial/DSP v1. Distance is modeled with both attenuation in the
     * frame above and high-frequency roll-off here; night depth adds a softer
     * occlusion-like top-end reduction. The user's EQ is summed underneath it.
     */
    private fun applySceneDsp(macros: SceneMacroState) {
        val user = eqSettingsProvider()
        val count = maxOf(5, user.bands.size)
        val bands = MutableList(count) { index -> if (user.enabled) user.bands.getOrElse(index) { 0 } else 0 }
        val distance = 1f - macros.enginePresence
        val highCut = (450f + 950f * distance + 650f * macros.nightDepth).toInt()
        val upperMidCut = (highCut * 0.52f).toInt()
        val lowBody = (180f * macros.turbulence).toInt()
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
        val stateId: String,
        val aircraftVolume: Float,
        val ventilationVolume: Float,
        val rumbleVolume: Float,
    )

    private fun passengerAircraftFrame(snapshot: SceneRuntimeSnapshot): AircraftFrame {
        val arcDuration = snapshot.arcMinutes * 60_000L
        val progress = if (arcDuration <= 0L) 0.45f else (snapshot.elapsedMs.toFloat() / arcDuration).coerceIn(0f, 1f)
        val state = when {
            snapshot.arcMinutes == 0 -> STATE_CRUISE
            progress < 0.10f -> STATE_SETTLING
            progress < 0.72f -> STATE_CRUISE
            progress < 0.90f -> STATE_DROWSY
            else -> STATE_DEEP_NIGHT
        }
        val stateDetail = when (state) {
            STATE_SETTLING -> 0.94f
            STATE_CRUISE -> 1.00f
            STATE_DROWSY -> 0.88f
            else -> 0.78f
        }
        val stateVent = when (state) {
            STATE_SETTLING -> 1.00f
            STATE_CRUISE -> 0.95f
            STATE_DROWSY -> 0.90f
            else -> 0.86f
        }
        val m = snapshot.macros
        val spatial = 0.78f + 0.22f * m.enginePresence
        val detail = 0.74f + 0.34f * m.cabinActivity
        val turbulenceWave = 1f + (0.045f * m.turbulence * sin((snapshot.elapsedMs / 2200.0) * 2.0 * PI).toFloat())
        val aircraft = (0.68f * stateDetail * spatial * detail * turbulenceWave).coerceIn(0.25f, 0.86f)
        val ventilation = (0.17f * stateVent * (0.92f + 0.15f * m.nightDepth)).coerceIn(0.08f, 0.26f)
        val rumble = (0.07f + 0.10f * m.enginePresence + 0.035f * m.turbulence).coerceIn(0.04f, 0.22f)
        return AircraftFrame(state, aircraft, ventilation, rumble)
    }

    private fun normalizeArc(minutes: Int): Int = when {
        minutes <= 0 -> 0
        minutes <= 30 -> 30
        minutes <= 60 -> 60
        else -> 120
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

        const val STATE_SETTLING = "settling"
        const val STATE_CRUISE = "cruise"
        const val STATE_DROWSY = "drowsy"
        const val STATE_DEEP_NIGHT = "deep_night"

        private const val TICK_MS = 1_000L
    }
}
