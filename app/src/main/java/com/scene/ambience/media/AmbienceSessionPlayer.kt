package com.scene.ambience.media

import android.os.Looper
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.TextureView
import androidx.media3.common.AudioAttributes
import androidx.media3.common.BasePlayer
import androidx.media3.common.C
import androidx.media3.common.DeviceInfo
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.common.Tracks
import androidx.media3.common.VideoSize
import androidx.media3.common.text.CueGroup
import androidx.media3.common.util.Size
import com.scene.ambience.data.model.PlaybackState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Media3 Player façade over [AmbienceEngine]. The engine state flow is
 * mirrored into Player state so MediaSession (and therefore the system UI,
 * media controllers and the notification) always reflects reality.
 * Timeline is a single static window; seeking and playlist editing are no-ops.
 */
class AmbienceSessionPlayer(private val engine: AmbienceEngine) : BasePlayer() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var job: Job? = null

    private val listeners = CopyOnWriteArrayList<Player.Listener>()

    private var playWhenReady = false
    private var playbackState = Player.STATE_IDLE

    private val timeline: Timeline = object : Timeline() {
        override fun getWindowCount(): Int = 1

        override fun getWindow(index: Int, window: Window, defaultPositionUs: Long): Window {
            window.uid = "ambience"
            window.mediaItem = MediaItem.EMPTY
            window.presentationStartTimeMs = C.TIME_UNSET
            window.windowStartTimeMs = C.TIME_UNSET
            window.elapsedRealtimeEpochOffsetMs = C.TIME_UNSET
            window.isDynamic = false
            window.isSeekable = false
            window.durationUs = C.TIME_UNSET
            window.firstPeriodIndex = 0
            window.lastPeriodIndex = 0
            window.defaultPositionUs = 0L
            window.positionInFirstPeriodUs = 0L
            return window
        }

        override fun getPeriodCount(): Int = 1

        override fun getPeriod(index: Int, period: Period, setIds: Boolean): Period {
            period.set("ambience", "ambience", 0, C.TIME_UNSET, 0)
            return period
        }

        override fun getIndexOfPeriod(uid: Any): Int = 0

        override fun getUidOfPeriod(periodIndex: Int): Any = "ambience"
    }

    private val availableCommands: Player.Commands = Player.Commands.Builder()
        .add(Player.COMMAND_PLAY_PAUSE)
        .add(Player.COMMAND_PREPARE)
        .add(Player.COMMAND_STOP)
        .add(Player.COMMAND_GET_CURRENT_MEDIA_ITEM)
        .add(Player.COMMAND_GET_TIMELINE)
        .add(Player.COMMAND_GET_VOLUME)
        .build()

    init {
        job = scope.launch {
            engine.state.collect { snapshot ->
                val state = if (snapshot.playbackState == PlaybackState.PLAYING || snapshot.playbackState == PlaybackState.PAUSED) {
                    Player.STATE_READY
                } else {
                    Player.STATE_IDLE
                }
                val pwr = snapshot.playbackState == PlaybackState.PLAYING
                if (state != playbackState) {
                    playbackState = state
                    listeners.forEach { it.onPlaybackStateChanged(state) }
                }
                if (pwr != playWhenReady) {
                    playWhenReady = pwr
                    listeners.forEach { it.onPlayWhenReadyChanged(pwr, Player.PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST) }
                }
            }
        }
    }

    // -------- listener plumbing -------------------------------------------------

    override fun addListener(listener: Player.Listener) {
        listeners.add(listener)
    }

    override fun removeListener(listener: Player.Listener) {
        listeners.remove(listener)
    }

    override fun getApplicationLooper(): Looper = Looper.getMainLooper()

    // -------- timeline / playlist (static single window, no-ops) ----------------

    override fun setMediaItems(items: MutableList<MediaItem>, resetPosition: Boolean) {
        // no-op
    }

    override fun setMediaItems(items: MutableList<MediaItem>, startIndex: Int, startPositionMs: Long) {
        // no-op
    }

    override fun addMediaItems(index: Int, items: MutableList<MediaItem>) {
        // no-op
    }

    override fun moveMediaItems(fromIndex: Int, toIndex: Int, newIndex: Int) {
        // no-op
    }

    override fun replaceMediaItems(fromIndex: Int, toIndex: Int, items: MutableList<MediaItem>) {
        // no-op
    }

    override fun removeMediaItems(fromIndex: Int, toIndex: Int) {
        // no-op
    }

    override fun getCurrentTimeline(): Timeline = timeline

    override fun getCurrentPeriodIndex(): Int = 0

    override fun getCurrentMediaItemIndex(): Int = 0

    override fun getCurrentTracks(): Tracks = Tracks.EMPTY

    // -------- transport ----------------------------------------------------------

    override fun getPlaybackState(): Int = playbackState

    override fun getPlaybackSuppressionReason(): Int = Player.PLAYBACK_SUPPRESSION_REASON_NONE

    override fun getPlayerError(): PlaybackException? = null

    override fun getPlayWhenReady(): Boolean = playWhenReady

    override fun setPlayWhenReady(playWhenReady: Boolean) {
        if (playWhenReady) engine.play() else engine.pause()
    }

    override fun prepare() {
        // playback starts on setPlayWhenReady(true)
    }

    override fun stop() {
        engine.stop()
    }

    override fun release() {
        job?.cancel()
        scope.cancel()
        listeners.clear()
    }

    override fun getSeekBackIncrement(): Long = 0L

    override fun getSeekForwardIncrement(): Long = 0L

    override fun getMaxSeekToPreviousPosition(): Long = 0L

    override fun seekTo(mediaItemIndex: Int, positionMs: Long, seekCommand: Int, isRepeatingCurrentItem: Boolean) {
        // no-op: continuous ambient audio has no timeline seeking
    }

    // -------- parameters ---------------------------------------------------------

    override fun setPlaybackParameters(playbackParameters: PlaybackParameters) {
        // no-op
    }

    override fun getPlaybackParameters(): PlaybackParameters = PlaybackParameters.DEFAULT

    override fun getRepeatMode(): Int = Player.REPEAT_MODE_OFF

    override fun setRepeatMode(repeatMode: Int) {
        // no-op
    }

    override fun getShuffleModeEnabled(): Boolean = false

    override fun setShuffleModeEnabled(shuffleModeEnabled: Boolean) {
        // no-op
    }

    override fun getTrackSelectionParameters(): TrackSelectionParameters = TrackSelectionParameters.DEFAULT_WITHOUT_CONTEXT

    override fun setTrackSelectionParameters(parameters: TrackSelectionParameters) {
        // no-op
    }

    override fun getMediaMetadata(): MediaMetadata = MediaMetadata.EMPTY

    override fun getPlaylistMetadata(): MediaMetadata = MediaMetadata.EMPTY

    override fun setPlaylistMetadata(mediaMetadata: MediaMetadata) {
        // no-op
    }

    // -------- timeline positions --------------------------------------------------

    override fun getDuration(): Long = C.TIME_UNSET

    override fun getCurrentPosition(): Long = 0L

    override fun getBufferedPosition(): Long = 0L

    override fun getTotalBufferedDuration(): Long = 0L

    override fun isPlayingAd(): Boolean = false

    override fun getCurrentAdGroupIndex(): Int = C.INDEX_UNSET

    override fun getCurrentAdIndexInAdGroup(): Int = C.INDEX_UNSET

    override fun getContentPosition(): Long = 0L

    override fun getContentBufferedPosition(): Long = 0L

    override fun isLoading(): Boolean = false

    // -------- audio / video / device (mostly no-ops) ------------------------------

    override fun getAudioAttributes(): AudioAttributes = AudioAttributes.DEFAULT

    override fun setAudioAttributes(audioAttributes: AudioAttributes, handleAudioFocus: Boolean) {
        // no-op
    }

    override fun setVolume(volume: Float) {
        engine.setMasterVolume(volume)
    }

    override fun getVolume(): Float = engine.snapshot().masterVolume

    override fun mute() {
        engine.setMasterMuted(true)
    }

    override fun unmute() {
        engine.setMasterMuted(false)
    }

    override fun clearVideoSurface() {
        // no-op
    }

    override fun clearVideoSurface(surface: Surface?) {
        // no-op
    }

    override fun setVideoSurface(surface: Surface?) {
        // no-op
    }

    override fun setVideoSurfaceHolder(surfaceHolder: SurfaceHolder?) {
        // no-op
    }

    override fun clearVideoSurfaceHolder(surfaceHolder: SurfaceHolder?) {
        // no-op
    }

    override fun setVideoSurfaceView(surfaceView: SurfaceView?) {
        // no-op
    }

    override fun clearVideoSurfaceView(surfaceView: SurfaceView?) {
        // no-op
    }

    override fun setVideoTextureView(textureView: TextureView?) {
        // no-op
    }

    override fun clearVideoTextureView(textureView: TextureView?) {
        // no-op
    }

    override fun getVideoSize(): VideoSize = VideoSize.UNKNOWN

    override fun getSurfaceSize(): Size = Size.UNKNOWN

    override fun getCurrentCues(): CueGroup = CueGroup(emptyList(), 0L)

    override fun getDeviceInfo(): DeviceInfo = DeviceInfo.UNKNOWN

    override fun getDeviceVolume(): Int = -1

    override fun isDeviceMuted(): Boolean = false

    override fun setDeviceVolume(volume: Int) {
        // no-op
    }

    override fun setDeviceVolume(volume: Int, flags: Int) {
        // no-op
    }

    override fun increaseDeviceVolume() {
        // no-op
    }

    override fun increaseDeviceVolume(flags: Int) {
        // no-op
    }

    override fun decreaseDeviceVolume() {
        // no-op
    }

    override fun decreaseDeviceVolume(flags: Int) {
        // no-op
    }

    override fun setDeviceMuted(muted: Boolean) {
        // no-op
    }

    override fun setDeviceMuted(muted: Boolean, flags: Int) {
        // no-op
    }

    override fun getAvailableCommands(): Player.Commands = availableCommands
}
