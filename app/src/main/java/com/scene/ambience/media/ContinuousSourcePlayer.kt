package com.scene.ambience.media

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.analytics.AnalyticsListener
import com.scene.ambience.data.model.AudioAssetManifest
import com.scene.ambience.util.CrossfadeEnvelope
import com.scene.ambience.util.FilePicker
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/**
 * Continuous ambience playback.
 *
 * All instances share one engine-owned playback looper instead of creating a
 * HandlerThread per sound source. ExoPlayers are created lazily on that looper,
 * so enabling several sources never blocks the service/UI thread. A single-file
 * seamless source uses one ExoPlayer; only cross-faded sources allocate a standby
 * player.
 */
class ContinuousSourcePlayer(
    private val context: Context,
    val sourceId: String,
    private val files: List<AudioAssetManifest>,
    private val loopMode: String,
    private val scope: CoroutineScope,
    private val playbackLooper: Looper,
    private val playbackDispatcher: CoroutineDispatcher,
    initialBaseGain: Float = 0f,
    private val onAudioSessionId: (Int) -> Unit = {},
    private val onPlayerError: (String) -> Unit = {},
) {

    private val errorListener = object : Player.Listener {
        override fun onPlayerError(error: PlaybackException) {
            Log.e(TAG, "PlayerError source=$sourceId code=${error.errorCodeName}")
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_ENDED) {
                Log.w(TAG, "LoopState source=$sourceId state=ENDED")
            }
        }
    }

    private val handler = Handler(playbackLooper)
    private val picker = FilePicker()
    private val failedFiles = mutableSetOf<String>()
    private val playerCount = if (loopMode == "seamless" && files.size == 1) 1 else 2
    private val envelopes = FloatArray(playerCount) { index -> if (index == 0) 1f else 0f }

    private var players: Array<ExoPlayer>? = null
    private var job: Job? = null

    @Volatile private var baseGain = initialBaseGain.coerceIn(0f, 1f)

    private val volumeUpdateRunnable = Runnable { applyEnvelopesNow() }

    fun start() {
        job?.cancel()
        job = scope.launch(playbackDispatcher) {
            val currentPlayers = ensurePlayers()
            currentPlayers.forEach { it.stop() }
            runLoop()
        }
    }

    fun resume() = start()

    fun pause() {
        job?.cancel()
        job = null
        handler.post { players?.forEach { it.pause() } }
    }

    fun stop() {
        job?.cancel()
        job = null
        handler.post { players?.forEach { it.stop() } }
    }

    fun release() {
        job?.cancel()
        job = null
        handler.removeCallbacks(volumeUpdateRunnable)
        handler.post {
            players?.forEach { it.release() }
            players = null
        }
    }

    /** Coalesce rapid master/fade updates to one runnable on the shared playback looper. */
    fun applyBaseVolume(baseGain: Float) {
        this.baseGain = baseGain.coerceIn(0f, 1f)
        if (Looper.myLooper() == playbackLooper) {
            applyEnvelopesNow()
        } else {
            handler.removeCallbacks(volumeUpdateRunnable)
            handler.post(volumeUpdateRunnable)
        }
    }

    private fun ensurePlayers(): Array<ExoPlayer> {
        players?.let { return it }
        check(Looper.myLooper() == playbackLooper) {
            "ContinuousSourcePlayer must create ExoPlayer on the shared playback looper"
        }
        val created = Array(playerCount) { createExoPlayer(context) }
        players = created
        applyEnvelopesNow()
        return created
    }

    private fun player(index: Int): ExoPlayer = ensurePlayers()[index]

    private fun createExoPlayer(context: Context): ExoPlayer {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()
        return ExoPlayer.Builder(context)
            .setLooper(playbackLooper)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus = */ false)
            .setHandleAudioBecomingNoisy(false)
            .build()
            .also {
                it.addListener(errorListener)
                it.addAnalyticsListener(object : AnalyticsListener {
                    override fun onAudioSessionIdChanged(
                        eventTime: AnalyticsListener.EventTime,
                        audioSessionId: Int,
                    ) {
                        if (audioSessionId != C.AUDIO_SESSION_ID_UNSET) {
                            onAudioSessionId(audioSessionId)
                        }
                    }
                })
            }
    }

    private fun uriFor(asset: AudioAssetManifest): android.net.Uri =
        android.net.Uri.parse("asset:///${asset.path}")

    private suspend fun runLoop() {
        ensurePlayers()
        if (playerCount == 1) {
            playSingleFile(files.single())
            return
        }

        var current = 0
        var currentFile = nextFile() ?: return
        envelopes[0] = 1f
        envelopes[1] = 0f
        prepareAndPlay(current, currentFile, repeat = false, initialEnvelope = 1f)
        while (kotlin.coroutines.coroutineContext.isActive) {
            var attemptedFile: AudioAssetManifest? = null
            try {
                val configuredFade = currentFile.crossfadeMs.takeIf { it > 0L } ?: AmbienceEngine.CROSSFADE_MS
                val reserve = minOf(configuredFade, currentFile.durationMs / 3)
                    .coerceAtLeast(200L)
                delayUntilRemaining(current, currentFile, reserve + PREPARE_LEAD_MS)

                val nextFile = nextFile() ?: continue
                attemptedFile = nextFile
                val standby = 1 - current
                prepare(standby, nextFile, repeat = false, initialEnvelope = 0f)
                delayUntilRemaining(current, currentFile, reserve)
                playPrepared(standby)
                val remaining = (playableDuration(current, currentFile) - player(current).currentPosition)
                    .coerceAtLeast(50L)
                val actualFade = minOf(reserve, remaining)
                crossfade(outgoingIndex = current, incomingIndex = standby, fadeMs = actualFade)
                player(current).stop()
                player(current).clearMediaItems()
                current = standby
                currentFile = nextFile
            } catch (e: kotlin.coroutines.cancellation.CancellationException) {
                throw e
            } catch (_: Exception) {
                attemptedFile?.let { failedFiles.add(it.assetId) }
                onPlayerError(sourceId)
                if (!player(current).isPlaying) {
                    val recovery = nextFile() ?: return
                    val standby = 1 - current
                    prepareAndPlay(standby, recovery, repeat = false, initialEnvelope = 1f)
                    player(current).stop()
                    player(current).clearMediaItems()
                    current = standby
                    currentFile = recovery
                }
            }
        }
    }

    private suspend fun playSingleFile(file: AudioAssetManifest) {
        envelopes[0] = 1f
        prepareAndPlay(index = 0, file = file, repeat = true, initialEnvelope = 1f)
        awaitCancellation()
    }

    private fun nextFile(): AudioAssetManifest? {
        repeat(files.size) {
            val index = picker.nextIndex(files.size)
            if (index >= 0 && files[index].assetId !in failedFiles) return files[index]
        }
        return null
    }

    private suspend fun prepareAndPlay(index: Int, file: AudioAssetManifest, repeat: Boolean, initialEnvelope: Float) {
        prepare(index, file, repeat, initialEnvelope)
        playPrepared(index)
    }

    private suspend fun prepare(index: Int, file: AudioAssetManifest, repeat: Boolean, initialEnvelope: Float) {
        val player = player(index)
        player.stop()
        player.clearMediaItems()
        player.repeatMode = if (repeat) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
        player.setMediaItem(MediaItem.fromUri(uriFor(file)))
        player.prepare()
        withTimeout(PREPARE_TIMEOUT_MS) {
            while (player.playbackState != Player.STATE_READY) delay(10L)
        }
        envelopes[index] = initialEnvelope
        applyEnvelopesNow()
    }

    private suspend fun playPrepared(index: Int) {
        val player = player(index)
        player.play()
        withTimeout(START_TIMEOUT_MS) {
            while (!player.isPlaying) delay(10L)
        }
    }

    private suspend fun crossfade(outgoingIndex: Int, incomingIndex: Int, fadeMs: Long) {
        val steps = CrossfadeEnvelope.stepsForDuration(fadeMs)
        val startedAt = SystemClock.elapsedRealtime()
        for (i in 1..steps) {
            val target = startedAt + fadeMs * i / steps
            delay((target - SystemClock.elapsedRealtime()).coerceAtLeast(0L))
            val t = i.toFloat() / steps
            val (outGain, inGain) = CrossfadeEnvelope.gains(t)
            envelopes[outgoingIndex] = outGain
            envelopes[incomingIndex] = inGain
            applyEnvelopesNow()
        }
    }

    private fun playableDuration(index: Int, file: AudioAssetManifest): Long =
        player(index).duration.takeIf { it > 0L && it != C.TIME_UNSET } ?: file.durationMs

    private suspend fun delayUntilRemaining(index: Int, file: AudioAssetManifest, targetRemainingMs: Long) {
        val remaining = playableDuration(index, file) - player(index).currentPosition
        delay((remaining - targetRemainingMs).coerceAtLeast(0L))
    }

    private fun applyEnvelopesNow() {
        val currentPlayers = players ?: return
        val gain = baseGain
        currentPlayers.forEachIndexed { index, player ->
            player.volume = gain * envelopes[index]
        }
    }

    companion object {
        private const val TAG = "AmbiencePlayback"
        private const val PREPARE_LEAD_MS = 3_000L
        private const val PREPARE_TIMEOUT_MS = 15_000L
        private const val START_TIMEOUT_MS = 3_000L
    }
}
