package com.scene.ambience.media

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.media.audiofx.BassBoost
import android.media.audiofx.DynamicsProcessing
import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.media.audiofx.Virtualizer
import android.os.Build
import android.util.Log
import com.scene.ambience.data.model.CategoryPresetConfig
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.data.model.EqSettings
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.FxSettings
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.PlaybackState
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
import kotlin.math.roundToInt
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
    private val fxSettingsProvider: () -> FxSettings = { FxSettings() },
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
    private var fxSettings = FxSettings()
    private val fxLock = Any()
    private val equalizers = mutableMapOf<Int, Equalizer>()
    private val bassBoosts = mutableMapOf<Int, BassBoost>()
    private val loudnessEnhancers = mutableMapOf<Int, LoudnessEnhancer>()
    private val dynamicsProcessors = mutableMapOf<Int, DynamicsProcessing>()
    @Suppress("DEPRECATION")
    private val virtualizers = mutableMapOf<Int, Virtualizer>()
    private val sessionSources = mutableMapOf<Int, String>()
    private val attachedSessions = mutableSetOf<Int>()

    init {
        fxSettings = fxSettingsProvider().normalized()
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
        if (v <= 0f) removePlayer(id) else startPlayerIfNeeded(id)
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
        for (id in sources.keys - next.keys) removePlayer(id)
        for ((id, s) in next) if (!s.enabled) removePlayer(id)
        sources = next.toMutableMap()
        for (id in next.keys) if (next[id]!!.enabled) startPlayerIfNeeded(id)
        recomputeVolumes()
        publish()
    }

    fun disableAllSources() {
        if (sources.values.none { it.enabled || it.volume > 0f || it.muted }) return
        for (id in sources.keys.toList()) removePlayer(id)
        sources = sources.mapValues { (_, s) -> s.copy(enabled = false, volume = 0f, muted = false) }.toMutableMap()
        activePresetId = null
        recomputeVolumes()
        if (playback == PlaybackState.PLAYING) pauseInternal(autoResume = false) else publish()
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
        for (id in sources.keys) if (ensurePlayer(id)) anyPlayable = true
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

    // -------- equalizer + internal FX rack ------------------------------------

    @Suppress("DEPRECATION")
    fun attachAudioEffects(sessionId: Int, sourceId: String) {
        if (sessionId <= 0) return
        var newlyAttached = false
        synchronized(fxLock) {
            sessionSources[sessionId] = sourceId
            newlyAttached = attachedSessions.add(sessionId)
            if (newlyAttached) {
                runCatching { Equalizer(0, sessionId) }
                    .onSuccess { equalizers[sessionId] = it }
                    .onFailure { Log.w(TAG, "Equalizer unavailable session=$sessionId", it) }
                runCatching { BassBoost(0, sessionId) }
                    .onSuccess { bassBoosts[sessionId] = it }
                    .onFailure { Log.w(TAG, "BassBoost unavailable session=$sessionId", it) }
                runCatching { LoudnessEnhancer(sessionId) }
                    .onSuccess { loudnessEnhancers[sessionId] = it }
                    .onFailure { Log.w(TAG, "LoudnessEnhancer unavailable session=$sessionId", it) }
                runCatching { Virtualizer(0, sessionId) }
                    .onSuccess { virtualizers[sessionId] = it }
                    .onFailure { Log.w(TAG, "Virtualizer unavailable session=$sessionId", it) }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    runCatching { DynamicsProcessing(sessionId) }
                        .onSuccess { dynamicsProcessors[sessionId] = it }
                        .onFailure { Log.w(TAG, "DynamicsProcessing unavailable session=$sessionId", it) }
                }
            }
        }
        applyEffectsToSession(sessionId)
        Log.d(TAG, "Audio effects attached session=$sessionId source=$sourceId new=$newlyAttached")
    }

    fun applyEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) {
        eqEnabled = enabled
        eqPreset = presetName
        eqBands = bands
        synchronized(fxLock) { equalizers.values.toList() }.forEach { applyEqTo(it) }
    }

    fun applyFx(settings: FxSettings) {
        fxSettings = settings.normalized()
        val sessions = synchronized(fxLock) { attachedSessions.toList() }
        sessions.forEach(::applyEffectsToSession)
    }

    private fun applyEffectsToSession(sessionId: Int) {
        val eq = synchronized(fxLock) { equalizers[sessionId] }
        if (eq != null) applyEqTo(eq)
        val boost = synchronized(fxLock) { bassBoosts[sessionId] }
        if (boost != null) applyBassTo(boost)
        val loudness = synchronized(fxLock) { loudnessEnhancers[sessionId] }
        if (loudness != null) applyLoudnessTo(loudness)
        val virtualizer = synchronized(fxLock) { virtualizers[sessionId] }
        if (virtualizer != null) applySpaceTo(virtualizer, synchronized(fxLock) { sessionSources[sessionId] })
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val dynamics = synchronized(fxLock) { dynamicsProcessors[sessionId] }
            if (dynamics != null) applyDynamicsTo(dynamics)
        }
    }

    private fun applyEqTo(eq: Equalizer) {
        try {
            val fx = fxSettings
            val toneActive = fx.enabled && (fx.warmth > 0.001f || fx.air > 0.001f)
            val shouldEnable = eqEnabled || toneActive
            if (!shouldEnable) {
                eq.enabled = false
                return
            }
            val range = eq.bandLevelRange
            val bandCount = eq.numberOfBands.toInt()
            for (band in 0 until bandCount) {
                val base = if (eqEnabled) eqBands.getOrNull(band) ?: 0 else 0
                val hz = eq.getCenterFreq(band.toShort()) / 1000f
                val warmthMb = if (fx.enabled) when {
                    hz < 120f -> (fx.warmth * 120f).roundToInt()
                    hz < 650f -> (fx.warmth * 240f).roundToInt()
                    hz < 1600f -> (fx.warmth * 90f).roundToInt()
                    else -> 0
                } else 0
                val airMb = if (fx.enabled) when {
                    hz >= 7000f -> (fx.air * 220f).roundToInt()
                    hz >= 3500f -> (fx.air * 100f).roundToInt()
                    else -> 0
                } else 0
                val level = (base + warmthMb + airMb)
                    .coerceIn(range[0].toInt(), range[1].toInt())
                eq.setBandLevel(band.toShort(), level.toShort())
            }
            eq.enabled = true
        } catch (e: Exception) {
            Log.e(TAG, "Equalizer/tone apply failed", e)
        }
    }

    private fun applyBassTo(boost: BassBoost) {
        runCatching {
            val amount = if (fxSettings.enabled) fxSettings.body else 0f
            if (amount <= 0.001f) {
                boost.enabled = false
            } else {
                if (boost.strengthSupported) boost.setStrength((amount * 550f).roundToInt().toShort())
                boost.enabled = true
            }
        }.onFailure { Log.w(TAG, "BassBoost apply failed", it) }
    }

    @Suppress("DEPRECATION")
    private fun applySpaceTo(effect: Virtualizer, sourceId: String?) {
        runCatching {
            val sensitivity = spaceSensitivity(sourceId)
            val amount = if (fxSettings.enabled) fxSettings.space * sensitivity else 0f
            if (amount <= 0.001f || !effect.strengthSupported) {
                effect.enabled = false
            } else {
                // Keep the global macro musical: even at 100%, low-sensitivity steady
                // noise sources only receive a small amount of widening.
                val strength = (amount * 820f).roundToInt().coerceIn(0, 1000).toShort()
                effect.setStrength(strength)
                effect.enabled = true
            }
        }.onFailure { Log.w(TAG, "Virtualizer/space apply failed source=$sourceId", it) }
    }

    private fun spaceSensitivity(sourceId: String?): Float = when (sourceId) {
        "forest" -> 0.96f
        "bamboo_forest" -> 0.94f
        "cafe" -> 0.92f
        "birds" -> 0.90f
        "aircraft_cabin" -> 0.88f
        "train" -> 0.86f
        "crickets" -> 0.84f
        "ocean" -> 0.82f
        "wind" -> 0.80f
        "city" -> 0.80f
        "stream", "water" -> 0.78f
        "singing_bowl" -> 0.76f
        "thunder" -> 0.72f
        "rain" -> 0.68f
        "fire" -> 0.62f
        "ventilation" -> 0.32f
        "fan" -> 0.24f
        "white_noise" -> 0.14f
        "pink_noise" -> 0.12f
        "brown_noise" -> 0.10f
        else -> 0.55f
    }

    private fun applyLoudnessTo(effect: LoudnessEnhancer) {
        runCatching {
            val amount = if (fxSettings.enabled) fxSettings.loudness else 0f
            if (amount <= 0.001f) {
                effect.enabled = false
            } else {
                effect.setTargetGain((amount * 450f).roundToInt())
                effect.enabled = true
            }
        }.onFailure { Log.w(TAG, "LoudnessEnhancer apply failed", it) }
    }

    private fun applyDynamicsTo(effect: DynamicsProcessing) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return
        runCatching {
            val amount = if (fxSettings.enabled) fxSettings.glue else 0f
            if (amount <= 0.001f) {
                effect.enabled = false
            } else {
                val limiter = DynamicsProcessing.Limiter(
                    true,
                    true,
                    0,
                    12f + (1f - amount) * 18f,
                    120f + amount * 180f,
                    2f + amount * 5f,
                    -2f - amount * 8f,
                    0f,
                )
                effect.setLimiterAllChannelsTo(limiter)
                effect.enabled = true
            }
        }.onFailure { Log.w(TAG, "DynamicsProcessing apply failed", it) }
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
                if (transientPausedForFocus && policy != FocusPolicy.PAUSE) transientPausedForFocus = false
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
                    FocusPolicy.DUCK, FocusPolicy.CONTINUE -> Unit
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
                onAudioSessionId = { sessionId -> attachAudioEffects(sessionId, id) },
                onPlayerError = { _ -> publish(message = "source_failed") },
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
        releaseEffectsForSource(id)
    }

    private fun releaseEffectsForSource(sourceId: String) {
        val sessions = synchronized(fxLock) {
            sessionSources.filterValues { it == sourceId }.keys.toList()
        }
        sessions.forEach(::releaseEffectSession)
    }

    private fun releaseEffectSession(sessionId: Int) {
        synchronized(fxLock) {
            runCatching { equalizers.remove(sessionId)?.release() }
            runCatching { bassBoosts.remove(sessionId)?.release() }
            runCatching { loudnessEnhancers.remove(sessionId)?.release() }
            runCatching { dynamicsProcessors.remove(sessionId)?.release() }
            @Suppress("DEPRECATION")
            runCatching { virtualizers.remove(sessionId)?.release() }
            sessionSources.remove(sessionId)
            attachedSessions.remove(sessionId)
        }
    }

    private fun isAudible(id: String): Boolean {
        val s = sources[id] ?: return false
        return playback == PlaybackState.PLAYING && s.enabled && !s.muted && s.volume > 0f && !masterMuted && sleepFade > 0f
    }

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
        synchronized(fxLock) {
            equalizers.values.forEach { runCatching { it.release() } }
            bassBoosts.values.forEach { runCatching { it.release() } }
            loudnessEnhancers.values.forEach { runCatching { it.release() } }
            dynamicsProcessors.values.forEach { runCatching { it.release() } }
            @Suppress("DEPRECATION")
            virtualizers.values.forEach { runCatching { it.release() } }
            equalizers.clear()
            bassBoosts.clear()
            loudnessEnhancers.clear()
            dynamicsProcessors.clear()
            virtualizers.clear()
            sessionSources.clear()
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
