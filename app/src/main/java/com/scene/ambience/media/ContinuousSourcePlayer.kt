package com.scene.ambience.media

import android.content.Context
import android.media.AudioManager
import android.os.Handler
import android.os.HandlerThread
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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.android.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import java.util.concurrent.CountDownLatch

/**
 * Continuous-loop player: two ExoPlayers cross-faded with an equal-power
 * envelope. Files rotate without consecutive repeats, with varying start
 * offsets (section 21).
 */
class ContinuousSourcePlayer(
    private val context: Context,
    val sourceId: String,
    private val files: List<AudioAssetManifest>,
    private val loopMode: String,
    private val scope: CoroutineScope,
    private val volumeProvider: () -> Float,
    private val onAudioSessionId: (Int) -> Unit = {},
    private val onPlayerError: (String) -> Unit = {},
) {

    private val errorListener = object : Player.Listener {
        override fun onPlayerError(error: PlaybackException) {
            Log.e(TAG, "PlayerError source=$sourceId code=${error.errorCodeName}")
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (isPlaying) Log.d(TAG, "PlayerStart source=$sourceId isPlaying=true")
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) {
                Log.d(TAG, "LoopTransition source=$sourceId reason=REPEAT")
            }
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_ENDED) {
                Log.w(TAG, "LoopState source=$sourceId state=ENDED")
            }
        }
    }

    private val playerThread = HandlerThread("ambience-player-$sourceId").apply { start() }
    private val handler = Handler(playerThread.looper)
    private val dispatcher = handler.asCoroutineDispatcher()
    private val players = buildPlayers()
    private val picker = FilePicker()
    private var job: Job? = null
    private var failedFiles = mutableSetOf<String>()

    private val envelopes = floatArrayOf(1f, 0f)

    private fun buildPlayers(): Array<ExoPlayer> {
        val latch = CountDownLatch(1)
        val result = arrayOfNulls<ExoPlayer>(2)
        handler.post {
            result[0] = createExoPlayer(context)
            result[1] = createExoPlayer(context)
            latch.countDown()
        }
        latch.await()
        return arrayOf(result[0]!!, result[1]!!)
    }

    fun start() {
        stop()
        job = scope.launch(dispatcher) {
            runLoop()
        }
    }

    fun resume() = start()

    fun pause() {
        job?.cancel()
        job = null
        handler.post { players.forEach { it.pause() } }
    }

    fun stop() {
        job?.cancel()
        job = null
        handler.post { players.forEach { it.stop() } }
    }

    fun release() {
        job?.cancel()
        job = null
        handler.post {
            players.forEach { it.release() }
            playerThread.quitSafely()
        }
    }

    fun applyBaseVolume(baseGain: Float) {
        handler.post {
            players.forEachIndexed { index, player ->
                player.volume = baseGain * envelopes[index]
            }
        }
    }

    private fun createExoPlayer(context: Context): ExoPlayer {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()
        return ExoPlayer.Builder(context)
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
        if (loopMode == "seamless" && files.size == 1) {
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
                val remaining = (playableDuration(current, currentFile) - players[current].currentPosition)
                    .coerceAtLeast(50L)
                val actualFade = minOf(reserve, remaining)
                Log.d(TAG, "CrossfadeStart source=$sourceId from=${currentFile.assetId} to=${nextFile.assetId}")
                crossfade(outgoingIndex = current, incomingIndex = standby, fadeMs = actualFade)
                players[current].stop()
                players[current].clearMediaItems()
                Log.d(TAG, "CrossfadeEnd source=$sourceId item=${nextFile.assetId}")
                current = standby
                currentFile = nextFile
            } catch (e: kotlin.coroutines.cancellation.CancellationException) {
                throw e
            } catch (e: Exception) {
                attemptedFile?.let { failedFiles.add(it.assetId) }
                onPlayerError(sourceId)
                if (!players[current].isPlaying) {
                    val recovery = nextFile() ?: return
                    val standby = 1 - current
                    prepareAndPlay(standby, recovery, repeat = false, initialEnvelope = 1f)
                    players[current].stop()
                    players[current].clearMediaItems()
                    current = standby
                    currentFile = recovery
                }
            }
        }
    }

    private suspend fun playSingleFile(file: AudioAssetManifest) {
        envelopes[1] = 0f
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
        val player = players[index]
        player.stop()
        player.clearMediaItems()
        player.repeatMode = if (repeat) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
        player.setMediaItem(MediaItem.fromUri(uriFor(file)))
        player.prepare()
        withTimeout(PREPARE_TIMEOUT_MS) {
            while (player.playbackState != Player.STATE_READY) delay(10L)
        }
        envelopes[index] = initialEnvelope
        applyEnvelopes()
        Log.d(TAG, "LoopPrepare source=$sourceId item=${file.assetId} repeat=${player.repeatMode}")
    }

    private suspend fun playPrepared(index: Int) {
        val player = players[index]
        player.play()
        withTimeout(START_TIMEOUT_MS) {
            while (!player.isPlaying) delay(10L)
        }
        Log.d(TAG, "LoopPlay source=$sourceId")
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
            applyEnvelopes()
        }
    }

    private fun playableDuration(index: Int, file: AudioAssetManifest): Long =
        players[index].duration.takeIf { it > 0L && it != C.TIME_UNSET } ?: file.durationMs

    private suspend fun delayUntilRemaining(index: Int, file: AudioAssetManifest, targetRemainingMs: Long) {
        val remaining = playableDuration(index, file) - players[index].currentPosition
        delay((remaining - targetRemainingMs).coerceAtLeast(0L))
    }

    private fun applyEnvelopes() {
        val base = volumeProvider()
        players[0].volume = base * envelopes[0]
        players[1].volume = base * envelopes[1]
    }

    companion object {
        private const val TAG = "AmbiencePlayback"
        private const val PREPARE_LEAD_MS = 3_000L
        private const val PREPARE_TIMEOUT_MS = 15_000L
        private const val START_TIMEOUT_MS = 3_000L
    }
}
