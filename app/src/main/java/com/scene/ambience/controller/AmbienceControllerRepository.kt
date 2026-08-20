package com.scene.ambience.controller

import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.media.AmbiencePlaybackService
import com.scene.ambience.media.Commands
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Owns the single [MediaController] used by the whole UI. Connects to
 * AmbiencePlaybackService on app start and mirrors the engine snapshot
 * pushed through session extras. All mixer mutations go through custom
 * session commands; play/pause/stop are standard player commands.
 */
class AmbienceControllerRepository(
    private val context: Context,
    private val scope: CoroutineScope,
) {

    private val sessionToken = SessionToken(
        context,
        ComponentName(context, AmbiencePlaybackService::class.java),
    )

    private val _controller = MutableStateFlow<MediaController?>(null)
    val controller: StateFlow<MediaController?> = _controller.asStateFlow()

    private val _snapshot = MutableStateFlow<EngineSnapshot?>(null)
    val snapshot: StateFlow<EngineSnapshot?> = _snapshot.asStateFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private var connecting = false
    private var reconnectJob: Job? = null
    private var snapshotParseJob: Job? = null

    // Master-volume drags can produce many Compose callbacks per second. Keep the UI
    // local and collapse binder commands to a maximum of roughly 25 updates/second.
    private var pendingMasterVolume: Float? = null
    private var masterVolumeJob: Job? = null

    /** Connect (or re-create the connection) to the playback service. */
    fun connect() {
        if ((_controller.value != null && _connected.value) || connecting) return
        connecting = true
        val listener = ControllerListener()
        val future = MediaController.Builder(context, sessionToken)
            .setListener(listener)
            .buildAsync()
        Futures.addCallback(future, object : com.google.common.util.concurrent.FutureCallback<MediaController> {
            override fun onSuccess(controller: MediaController?) {
                connecting = false
                if (controller != null) attach(controller) else scheduleReconnect()
            }

            override fun onFailure(t: Throwable) {
                connecting = false
                _connected.value = false
                scheduleReconnect()
            }
        }, MoreExecutors.directExecutor())
    }

    private fun scheduleReconnect() {
        if (reconnectJob?.isActive == true) return
        reconnectJob = scope.launch {
            delay(RECONNECT_DELAY_MS)
            connect()
        }
    }

    private fun attach(controller: MediaController) {
        reconnectJob?.cancel()
        reconnectJob = null
        _controller.value = controller
        _connected.value = true
        parseSnapshotAsync(controller.sessionExtras)
    }

    /** JSON decoding can be measurable on older phones; keep it off the UI thread. */
    private fun parseSnapshotAsync(extras: Bundle) {
        val copy = Bundle(extras)
        snapshotParseJob?.cancel()
        snapshotParseJob = scope.launch(Dispatchers.Default) {
            val parsed = Commands.parseSnapshot(copy)
            if (isActive && parsed != null) _snapshot.value = parsed
        }
    }

    private inner class ControllerListener : MediaController.Listener {
        override fun onExtrasChanged(controller: MediaController, extras: Bundle) {
            parseSnapshotAsync(extras)
        }

        override fun onDisconnected(controller: MediaController) {
            snapshotParseJob?.cancel()
            _connected.value = false
            _controller.value = null
            scheduleReconnect()
        }
    }

    // -------- player commands ---------------------------------------------------

    fun play() {
        val c = _controller.value ?: return
        if (c.isCommandAvailable(Player.COMMAND_PLAY_PAUSE)) c.play()
    }

    fun pause() {
        val c = _controller.value ?: return
        if (c.isCommandAvailable(Player.COMMAND_PLAY_PAUSE)) c.pause()
    }

    fun togglePlayPause() {
        val c = _controller.value ?: return
        if (c.isCommandAvailable(Player.COMMAND_PLAY_PAUSE)) {
            if (c.isPlaying) c.pause() else c.play()
        }
    }

    fun stop() {
        val c = _controller.value ?: return
        if (c.isCommandAvailable(Player.COMMAND_STOP)) c.stop()
    }

    // -------- custom commands ----------------------------------------------------

    /** Send a custom command; returns null when not yet connected. */
    fun dispatch(command: SessionCommand): ListenableFuture<SessionResult>? =
        _controller.value?.sendCustomCommand(command, command.customExtras ?: Bundle())

    fun setMasterVolume(volume: Float) {
        pendingMasterVolume = volume.coerceIn(0f, 1f)
        if (masterVolumeJob?.isActive == true) return
        masterVolumeJob = scope.launch {
            while (isActive) {
                val next = pendingMasterVolume
                pendingMasterVolume = null
                if (next != null) dispatch(Commands.setMasterVolume(next))
                delay(MASTER_VOLUME_INTERVAL_MS)
                if (pendingMasterVolume == null) break
            }
        }
    }

    private fun flushPendingMasterVolume() {
        masterVolumeJob?.cancel()
        masterVolumeJob = null
        val pending = pendingMasterVolume
        pendingMasterVolume = null
        if (pending != null) dispatch(Commands.setMasterVolume(pending))
    }

    private fun discardPendingMasterVolume() {
        masterVolumeJob?.cancel()
        masterVolumeJob = null
        pendingMasterVolume = null
    }

    fun setMasterMuted(muted: Boolean) {
        // Preserve command ordering: a delayed volume command must never unmute after mute.
        flushPendingMasterVolume()
        dispatch(Commands.setMasterMuted(muted))
    }

    fun setSourceVolume(id: String, volume: Float) {
        dispatch(Commands.setSourceVolume(id, volume))
    }

    fun setSourceMuted(id: String, muted: Boolean) {
        dispatch(Commands.setSourceMuted(id, muted))
    }

    fun applyMix(mixJson: String, presetId: String?) {
        // A pending drag from the previous mix must not overwrite a newly applied preset.
        discardPendingMasterVolume()
        dispatch(Commands.applyMix(mixJson, presetId))
    }

    fun disableAllSources() {
        dispatch(Commands.disableAllSources)
    }

    fun startSleepTimer(durationMs: Long, fadeMs: Long) {
        dispatch(Commands.startSleepTimer(durationMs, fadeMs))
    }

    fun cancelSleepTimer() {
        dispatch(Commands.cancelSleepTimer)
    }

    fun clearMessage() {
        dispatch(Commands.clearMessage)
    }

    fun setEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) {
        dispatch(Commands.setEqualizer(enabled, presetName, bands))
    }

    /** Convenience: fire-and-forget dispatch with error swallowing. */
    fun dispatchQuietly(command: SessionCommand) {
        val future = dispatch(command) ?: return
        Futures.addCallback(future, object : com.google.common.util.concurrent.FutureCallback<SessionResult> {
            override fun onSuccess(result: SessionResult?) {}
            override fun onFailure(t: Throwable) {}
        }, MoreExecutors.directExecutor())
    }

    fun release() {
        reconnectJob?.cancel()
        snapshotParseJob?.cancel()
        masterVolumeJob?.cancel()
        reconnectJob = null
        snapshotParseJob = null
        masterVolumeJob = null
        pendingMasterVolume = null
        connecting = false
        _connected.value = false
        _controller.value?.release()
        _controller.value = null
    }

    companion object {
        private const val MASTER_VOLUME_INTERVAL_MS = 40L
        private const val RECONNECT_DELAY_MS = 500L
    }
}
