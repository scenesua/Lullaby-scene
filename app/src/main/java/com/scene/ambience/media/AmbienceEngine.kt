package com.scene.ambience.media

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.media.audiofx.Equalizer
import android.util.Log
import com.scene.ambience.data.model.CategoryPresetConfig
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.data.model.EqSettings
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.data.model.SourceManifest
import com.scene.ambience.data.model.SourceState
import com.scene.ambience.data.model.SoundLibraryState
import com.scene.ambience.util.SleepTimerMath
import com.scene.ambience.util.VolumeCurve
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * The single playback engine. Owned by AmbiencePlaybackService; its state
 * flow is the single source of truth that MediaSession, the notification
 * and all UI clients mirror.
 */
class AmbienceEngine(
    private val context: Context,
    private val library: SoundLibraryState,
    private val scope: CoroutineScope,
    private val focusPolicyProvider: () -> FocusPolicy,
    private val eqSettingsProvider: () -> EqSettings = { EqSettings() },
    private val onStopRequested: () -> Unit = {},
) {

    private val _state = MutableStateFlow(EngineSnapshot())
    val state: StateFlow<EngineSnapshot> = _state.asStateFlow()

    private val continuousPlayers = mutableMapOf<String, ContinuousSourcePlayer>()
    private val eventPlayers = mutableMapOf<String, EventSourcePlayer>()

    private val soundPool: SoundPool = SoundPool.Builder()
        .setMaxStreams(MAX_EVENT_STREAMS)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
        )
        .build()

    private var eqEnabled = false
    private var eqPreset = ""
    private var eqBands: List<Int> = emptyList()
    private val eqLock = Any()
    private val equalizers = mutableMapOf<Int, Equalizer>()
    private val attachedSessions = mutableSetOf<Int>()

    init {
        val eq = eqSettingsProvider()
        applyEqualizer(eq.enabled, eq.presetName, eq.bands)
    }

    private val focusController = AudioFocusController(context) { event -> onFocusEvent(event) }
    private val noisyReceiver = BecomingNoisyReceiver(context)
    private val wakelockController = WakelockController(context)
    private val sleepTimer = SleepTimerController(this, scope)

    private var sources = mutableMapOf<String, SourceState>()
    private var masterVolume = 0.8f
    private var masterMuted = false
    private var playback = PlaybackState.IDLE

    private var sleepFade = 1f
    private var duckFactor = 1f
    private var activePresetId: String? = null
    private var transientPausedForFocus = false
    private var ducked = false

    private var updateJob: Job? = null

    private val random = Random(System.currentTimeMillis())

    fun setMasterVolume(volume: Float) {
        masterVolume = volume.coerceIn(0f, 1f)
        if (masterVolume > 0f) masterMuted = false
        recomputeVolumes()
        publish()
    }

    fun setMasterMuted(muted: Boolean) {
        masterMuted = muted
        recomputeVolumes()
        publish()
    }

    fun setSourceVolume(id: String, volume: Float) {
        val v = volume.coerceIn(0f, 1f)
        val current = sources[id] ?: SourceState(id = id)
        sources[id] = current.copy(enabled = v > 0f, volume = v)
        Log.d("AmbiencePlayback", "EngineVolume source=$id value=$v active=${v > 0f}")
        if (v <= 0f) {
            removePlayer(id)
        } else {
            startPlayerIfNeeded(id)
        }
        recomputeVolumes()
        publish()
    }

    fun setSourceMuted(id: String, muted: Boolean) {
        val current = sources[id] ?: SourceState(id = id)
        sources[id] = current.copy(muted = muted)
        recomputeVolumes()
        publish()
    }

    fun applyMix(mix: MixState, presetId: String? = null) {
        masterVolume = mix.masterVolume.coerceIn(0f, 1f)
        masterMuted = mix.masterMuted
        activePresetId = presetId
        val next = mix.sources.mapValues { (id, s) ->
            s.copy(enabled = s.volume > 0f && library.manifestFor(id) != null)
        }
        for (id in sources.keys - next.keys) {
            removePlayer(id)
        }
        for ((id, s) in next) {
            if (!s.enabled) removePlayer(id)
        }
        sources = next.toMutableMap()
        for (id in next.keys) {
            if (next[id]!!.enabled) startPlayerIfNeeded(id)
        }
        recomputeVolumes()
        publish()
    }

    /** Turns every source off at once (volume 0, unmuted, disabled) and drops its player. */
    fun disableAllSources() {
        if (sources.values.none { it.enabled || it.volume > 0f || it.muted }) return
        for (id in sources.keys.toList()) {
            removePlayer(id)
        }
        sources = sources.mapValues { (_, s) -> s.copy(enabled = false, volume = 0f, muted = false) }.toMutableMap()
        activePresetId = null
        recomputeVolumes()
        if (playback == PlaybackState.PLAYING) {
            pauseInternal(autoResume = false)
        } else {
            publish()
        }
    }

    fun play() {
        if (sources.values.none { it.enabled }) {
            publish(message = "no_active_sources")
            return
        }
        if (playback == PlaybackState.PLAYING) {
            publish()
            return
        }
        transientPausedForFocus = false
        focusController.request(focusPolicyProvider())
        var anyPlayable = false
        for (id in sources.keys) {
            if (ensurePlayer(id)) anyPlayable = true
        }
        if (!anyPlayable) {
            publish(message = "no_playable_sources")
            return
        }
        noisyReceiver.register { onOutputBecameNoisy() }
        wakelockController.acquire()
        playback = PlaybackState.PLAYING
        sources.keys.forEach { id ->
            continuousPlayers[id]?.resume()
            eventPlayers[id]?.start()
        }
        publish()
    }

    fun pause() = pauseInternal(autoResume = false)

    fun pauseForFocusLoss() = pauseInternal(autoResume = false)

    private fun pauseInternal(autoResume: Boolean) {
        if (playback != PlaybackState.PLAYING) return
        playback = PlaybackState.PAUSED
        transientPausedForFocus = autoResume
        continuousPlayers.values.forEach { it.pause() }
        eventPlayers.values.forEach { it.stopScheduling() }
        noisyReceiver.unregister()
        wakelockController.release()
        focusController.abandon()
        publish()
    }

    fun stop() {
        sleepTimer.cancel()
        transientPausedForFocus = false
        continuousPlayers.values.forEach { it.stop() }
        eventPlayers.values.forEach { it.stopScheduling() }
        noisyReceiver.unregister()
        wakelockController.release()
        focusController.abandon()
        playback = PlaybackState.STOPPED
        sleepFade = 1f
        duckFactor = 1f
        publish()
        onStopRequested()
    }

    fun clearMessage() {
        publish(message = null)
    }

    // -------- equalizer ---------------------------------------------------------

    fun attachEqualizer(sessionId: Int) {
        if (sessionId <= 0) return
        val eq = synchronized(eqLock) {
            if (attachedSessions.contains(sessionId)) return
            val created = runCatching { Equalizer(0, sessionId) }.getOrNull() ?: return
            attachedSessions.add(sessionId)
            equalizers[sessionId] = created
            created
        }
        applyTo(eq)
        Log.d(TAG, "Equalizer attached session=$sessionId")
    }

    fun applyEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) {
        eqEnabled = enabled
        eqPreset = presetName
        eqBands = bands
        val current = synchronized(eqLock) { equalizers.values.toList() }
        current.forEach { applyTo(it) }
    }

    private fun applyTo(eq: Equalizer) {
        try {
            if (eqEnabled) {
                val range = eq.bandLevelRange
                val bandCount = eq.numberOfBands.toInt()
                for (band in 0 until bandCount) {
                    val level = eqBands.getOrNull(band)?.coerceIn(range[0].toInt(), range[1].toInt()) ?: 0
                    eq.setBandLevel(band.toShort(), level.toShort())
                }
                eq.enabled = true
                Log.d(TAG, "Equalizer applied preset=$eqPreset bands=$eqBands")
            } else {
                eq.enabled = false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Equalizer apply failed", e)
        }
    }

    // -------- timer integration -------------------------------------------------

    fun startSleepTimer(durationMs: Long, fadeMs: Long) {
        sleepTimer.start(durationMs, fadeMs)
    }

    fun cancelSleepTimer() {
        sleepTimer.cancel()
    }

    fun restoreSleepTimer(endEpochMs: Long, fadeMs: Long) {
        sleepTimer.restore(endEpochMs, fadeMs)
    }

    fun onTimerRemaining(remainingMs: Long?) {
        publish(timerRemaining = remainingMs)
    }

    fun onTimerFinished() {
        if (playback == PlaybackState.PLAYING) pauseInternal(autoResume = false)
        stop()
    }

    fun setSleepFade(fade: Float) {
        sleepFade = fade.coerceIn(0f, 1f)
        recomputeVolumes()
        publish()
    }

    /** Restore fade smoothly after the user cancels a fading timer. */
    fun restoreSleepFade() {
        if (sleepFade >= 1f) return
        scope.launch {
            val start = sleepFade
            val steps = 25
            for (i in 1..steps) {
                sleepFade = start + (1f - start) * (i.toFloat() / steps)
                recomputeVolumes()
                publish()
                delay(20L)
            }
            sleepFade = 1f
        }
    }

    // -------- focus / noisy -----------------------------------------------------

    fun onFocusEvent(event: FocusEvent) {
        val policy = focusPolicyProvider()
        when (event) {
            FocusEvent.GAIN -> {
                if (ducked) {
                    ducked = false
                    duckFactor = 1f
                    recomputeVolumes()
                    publish()
                }
                if (transientPausedForFocus && policy != FocusPolicy.PAUSE) {
                    transientPausedForFocus = false
                }
            }
            FocusEvent.LOSS -> {
                pauseForFocusLoss()
                publish(message = "focus_lost_paused")
            }
            FocusEvent.LOSS_TRANSIENT -> {
                when (policy) {
                    FocusPolicy.PAUSE -> {
                        pauseForFocusLoss()
                        publish(message = "focus_paused")
                    }
                    FocusPolicy.DUCK, FocusPolicy.CONTINUE -> {
                        // handled below for all policies on CAN_DUCK too
                    }
                }
            }
            FocusEvent.DUCK -> {
                ducked = true
                duckFactor = DUCK_FACTOR
                recomputeVolumes()
                publish()
            }
        }
    }

    fun onOutputBecameNoisy() {
        if (playback != PlaybackState.PLAYING) return
        pauseInternal(autoResume = false)
        publish(message = "noisy_paused")
    }

    // -------- players -----------------------------------------------------------

    private fun ensurePlayer(id: String): Boolean {
        val manifest = library.manifestFor(id) ?: return false
        val state = sources[id] ?: return false
        if (!state.enabled) return false
        if (manifest.continuous.isNotEmpty() && continuousPlayers[id] == null) {
            continuousPlayers[id] = ContinuousSourcePlayer(
                context = context,
                sourceId = id,
                files = manifest.continuous,
                loopMode = manifest.loopMode,
                scope = scope,
                volumeProvider = { sourceGain(id) },
                onAudioSessionId = { sessionId -> attachEqualizer(sessionId) },
                onPlayerError = { sourceId ->
                    publish(message = "source_failed")
                },
            )
        }
        if (manifest.events.isNotEmpty() && eventPlayers[id] == null) {
            val config = library.categoryPresets[id] ?: CategoryPresetConfig()
            eventPlayers[id] = EventSourcePlayer(
                context = context,
                sourceId = id,
                files = manifest.events,
                config = config,
                soundPool = soundPool,
                scope = scope,
                randomSeed = random.nextLong(),
                volumeProvider = { sourceGain(id) },
                isActive = { isAudible(id) },
            )
        }
        return continuousPlayers[id] != null || eventPlayers[id] != null
    }

    /** Creates the source's players (if missing) and starts them when playing. */
    private fun startPlayerIfNeeded(id: String) {
        if (playback != PlaybackState.PLAYING) return
        val hadPlayer = continuousPlayers.containsKey(id) || eventPlayers.containsKey(id)
        val playable = ensurePlayer(id)
        if (!hadPlayer && playable) {
            continuousPlayers[id]?.resume()
            eventPlayers[id]?.start()
        }
    }

    private fun removePlayer(id: String) {
        continuousPlayers.remove(id)?.release()
        eventPlayers.remove(id)?.release()
    }

    private fun isAudible(id: String): Boolean {
        val s = sources[id] ?: return false
        return playback == PlaybackState.PLAYING && s.enabled && !s.muted && s.volume > 0f && !masterMuted && sleepFade > 0f
    }

    /** Final per-source gain including master, mute, sleep fade, duck and mix normalization. */
    fun sourceGain(id: String): Float {
        val s = sources[id] ?: return 0f
        val activeCount = sources.values.count { it.enabled }
        val baseGain = VolumeCurve.combinedGain(
            sourceVolume = s.volume,
            sourceMuted = s.muted,
            masterVolume = masterVolume,
            masterMuted = masterMuted,
            sleepFade = sleepFade,
            focusDuck = duckFactor,
            activeSourceCount = activeCount.coerceAtLeast(1),
            mixNormalization = true,
        )
        val trimGain = library.manifestFor(id)?.trimGain ?: 1f
        return (baseGain * trimGain).coerceAtMost(1f)
    }

    private fun recomputeVolumes() {
        val gains = sources.keys.associateWith { sourceGain(it) }
        continuousPlayers.forEach { (id, p) -> p.applyBaseVolume(gains[id] ?: 0f) }
        eventPlayers.forEach { (id, p) -> p.applyBaseVolume(gains[id] ?: 0f) }
    }

    // -------- state publication ------------------------------------------------

    private fun publish(timerRemaining: Long? = null, message: String? = null) {
        val current = _state.value
        _state.value = current.copy(
            playbackState = playback,
            masterVolume = masterVolume,
            masterMuted = masterMuted,
            sources = sources.toMap(),
            sleepTimerRemainingMs = timerRemaining ?: sleepTimer.remainingMs,
            sleepFading = sleepFade < 1f,
            activePresetId = activePresetId,
            message = message ?: current.message,
        )
    }

    fun snapshot(): EngineSnapshot = _state.value

    fun release() {
        sleepTimer.cancel()
        continuousPlayers.values.forEach { it.release() }
        eventPlayers.values.forEach { it.release() }
        continuousPlayers.clear()
        eventPlayers.clear()
        noisyReceiver.unregister()
        wakelockController.release()
        focusController.abandon()
        synchronized(eqLock) {
            equalizers.values.forEach { runCatching { it.release() } }
            equalizers.clear()
            attachedSessions.clear()
        }
        soundPool.release()
        playback = PlaybackState.STOPPED
    }

    companion object {
        const val MAX_EVENT_STREAMS = 12
        const val DUCK_FACTOR = 0.25f
        const val CROSSFADE_MS = 8000L
        private const val TAG = "AmbienceEngine"
    }
}

enum class FocusEvent { GAIN, LOSS, LOSS_TRANSIENT, DUCK }
