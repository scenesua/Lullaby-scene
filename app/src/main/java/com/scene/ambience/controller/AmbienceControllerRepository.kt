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
import com.scene.ambience.data.model.FxSettings
import com.scene.ambience.data.model.SceneRuntimeSnapshot
import com.scene.ambience.media.AmbiencePlaybackService
import com.scene.ambience.media.Commands
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Single MediaController facade used by all Compose screens. */
class AmbienceControllerRepository(
    private val context: Context,
    private val scope: CoroutineScope,
) {
    private val sessionToken = SessionToken(context, ComponentName(context, AmbiencePlaybackService::class.java))

    private val _controller = MutableStateFlow<MediaController?>(null)
    val controller: StateFlow<MediaController?> = _controller.asStateFlow()

    private val _snapshot = MutableStateFlow<EngineSnapshot?>(null)
    val snapshot: StateFlow<EngineSnapshot?> = _snapshot.asStateFlow()

    private val _sceneSnapshot = MutableStateFlow(SceneRuntimeSnapshot())
    val sceneSnapshot: StateFlow<SceneRuntimeSnapshot> = _sceneSnapshot.asStateFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private var buildJob: Job? = null
    private var parseJob: Job? = null
    private var masterVolumeJob: Job? = null
    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var released = false

    @Volatile private var pendingMasterVolume: Float? = null

    fun connect() {
        if (released || (_controller.value != null && _connected.value)) return
        if (buildJob?.isActive == true) return
        buildJob = scope.launch {
            val listener = ControllerListener()
            val future = MediaController.Builder(context, sessionToken)
                .setListener(listener)
                .buildAsync()
            controllerFuture = future
            Futures.addCallback(future, object : com.google.common.util.concurrent.FutureCallback<MediaController> {
                override fun onSuccess(controller: MediaController?) {
                    if (released) {
                        controller?.release()
                        return
                    }
                    if (controller != null) attach(controller)
                }

                override fun onFailure(t: Throwable) {
                    if (released) return
                    _connected.value = false
                    scheduleReconnect()
                }
            }, MoreExecutors.directExecutor())
        }
    }

    private fun scheduleReconnect() {
        if (released) return
        buildJob?.cancel()
        buildJob = scope.launch {
            delay(RECONNECT_DELAY_MS)
            buildJob = null
            connect()
        }
    }

    private fun attach(controller: MediaController) {
        _controller.value?.takeIf { it !== controller }?.release()
        _controller.value = controller
        _connected.value = true
        parseExtras(Bundle(controller.sessionExtras))
    }

    private fun parseExtras(extras: Bundle) {
        parseJob?.cancel()
        parseJob = scope.launch {
            val parsed = withContext(Dispatchers.Default) {
                Commands.parseSnapshot(extras) to Commands.parseSceneSnapshot(extras)
            }
            _snapshot.value = parsed.first
            _sceneSnapshot.value = parsed.second
        }
    }

    private inner class ControllerListener : MediaController.Listener {
        override fun onExtrasChanged(controller: MediaController, extras: Bundle) {
            // Bundle is copied before leaving the callback; decoding can then happen safely off-main.
            parseExtras(Bundle(extras))
        }

        override fun onDisconnected(controller: MediaController) {
            if (_controller.value === controller) {
                _connected.value = false
                _controller.value = null
            }
            if (!released) scheduleReconnect()
        }
    }

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

    fun dispatch(command: SessionCommand): ListenableFuture<SessionResult>? =
        _controller.value?.sendCustomCommand(command, command.customExtras ?: Bundle())

    /**
     * Slider input can arrive much faster than audio/UI frames. Keep only the newest
     * value in each short window instead of serializing a MediaSession command for
     * every pointer movement.
     */
    fun setMasterVolume(volume: Float) {
        pendingMasterVolume = volume.coerceIn(0f, 1f)
        if (masterVolumeJob?.isActive == true) return
        masterVolumeJob = scope.launch {
            while (!released) {
                delay(MASTER_VOLUME_WINDOW_MS)
                val latest = pendingMasterVolume ?: break
                pendingMasterVolume = null
                dispatch(Commands.setMasterVolume(latest))
                if (pendingMasterVolume == null) break
            }
        }
    }

    fun setMasterMuted(muted: Boolean) = dispatch(Commands.setMasterMuted(muted))
    fun setSourceVolume(id: String, volume: Float) = dispatch(Commands.setSourceVolume(id, volume))
    fun setSourceMuted(id: String, muted: Boolean) = dispatch(Commands.setSourceMuted(id, muted))
    fun applyMix(mixJson: String, presetId: String?) = dispatch(Commands.applyMix(mixJson, presetId))
    fun disableAllSources() = dispatch(Commands.disableAllSources)
    fun startSleepTimer(durationMs: Long, fadeMs: Long) = dispatch(Commands.startSleepTimer(durationMs, fadeMs))
    fun cancelSleepTimer() = dispatch(Commands.cancelSleepTimer)
    fun clearMessage() = dispatch(Commands.clearMessage)
    fun setEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) = dispatch(Commands.setEqualizer(enabled, presetName, bands))
    fun setFx(settings: FxSettings) = dispatch(Commands.setFx(settings))

    fun startScene(sceneId: String, totalDurationMinutes: Int) = dispatch(Commands.startScene(sceneId, totalDurationMinutes))
    fun stopScene() = dispatch(Commands.stopScene)
    fun setSceneMacro(key: String, value: Float) = dispatch(Commands.setSceneMacro(key, value))
    fun setSceneDuration(minutes: Int) = dispatch(Commands.setSceneDuration(minutes))
    fun seekScene(elapsedMs: Long) = dispatch(Commands.seekScene(elapsedMs))
    fun stepScenePhase(direction: Int) = dispatch(Commands.stepScenePhase(direction))
    fun setSceneRandomEvents(enabled: Boolean) = dispatch(Commands.setSceneRandomEvents(enabled))

    fun dispatchQuietly(command: SessionCommand) {
        val future = dispatch(command) ?: return
        Futures.addCallback(future, object : com.google.common.util.concurrent.FutureCallback<SessionResult> {
            override fun onSuccess(result: SessionResult?) {}
            override fun onFailure(t: Throwable) {}
        }, MoreExecutors.directExecutor())
    }

    fun release() {
        if (released) return
        released = true
        buildJob?.cancel()
        parseJob?.cancel()
        masterVolumeJob?.cancel()
        controllerFuture?.cancel(true)
        controllerFuture = null
        pendingMasterVolume = null
        _connected.value = false
        _controller.value?.release()
        _controller.value = null
    }

    companion object {
        private const val MASTER_VOLUME_WINDOW_MS = 32L
        private const val RECONNECT_DELAY_MS = 500L
    }
}
