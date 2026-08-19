package com.scene.ambience.controller

import android.content.ComponentName
import android.content.Context
import android.util.Log
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.data.model.SceneRuntimeSnapshot
import com.scene.ambience.media.AmbiencePlaybackService
import com.scene.ambience.media.Commands
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

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
    private var listenerAttached = false

    fun connect() {
        if (_controller.value != null && _connected.value) return
        buildJob?.cancel()
        buildJob = scope.launch {
            val listener = ControllerListener()
            val future = MediaController.Builder(context, sessionToken)
                .setListener(listener)
                .buildAsync()
            listenerAttached = true
            Futures.addCallback(future, object : com.google.common.util.concurrent.FutureCallback<MediaController> {
                override fun onSuccess(controller: MediaController?) {
                    if (controller != null) attach(controller)
                }
                override fun onFailure(t: Throwable) {
                    listenerAttached = false
                    _connected.value = false
                    connect()
                }
            }, MoreExecutors.directExecutor())
        }
    }

    private fun attach(controller: MediaController) {
        _controller.value = controller
        _connected.value = true
        _snapshot.value = Commands.parseSnapshot(controller.sessionExtras)
        _sceneSnapshot.value = Commands.parseSceneSnapshot(controller.sessionExtras)
    }

    private inner class ControllerListener : MediaController.Listener {
        override fun onExtrasChanged(controller: MediaController, extras: android.os.Bundle) {
            _snapshot.value = Commands.parseSnapshot(extras)
            _sceneSnapshot.value = Commands.parseSceneSnapshot(extras)
        }
        override fun onDisconnected(controller: MediaController) {
            _connected.value = false
            _controller.value = null
            listenerAttached = false
            connect()
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
        _controller.value?.sendCustomCommand(command, command.customExtras ?: android.os.Bundle())

    fun setMasterVolume(volume: Float) = dispatch(Commands.setMasterVolume(volume))
    fun setMasterMuted(muted: Boolean) = dispatch(Commands.setMasterMuted(muted))

    fun setSourceVolume(id: String, volume: Float) {
        Log.d("AmbiencePlayback", "ControllerCommand source=$id value=$volume")
        dispatch(Commands.setSourceVolume(id, volume))
    }

    fun setSourceMuted(id: String, muted: Boolean) = dispatch(Commands.setSourceMuted(id, muted))
    fun applyMix(mixJson: String, presetId: String?) = dispatch(Commands.applyMix(mixJson, presetId))
    fun disableAllSources() = dispatch(Commands.disableAllSources)
    fun startSleepTimer(durationMs: Long, fadeMs: Long) = dispatch(Commands.startSleepTimer(durationMs, fadeMs))
    fun cancelSleepTimer() = dispatch(Commands.cancelSleepTimer)
    fun clearMessage() = dispatch(Commands.clearMessage)
    fun setEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) = dispatch(Commands.setEqualizer(enabled, presetName, bands))

    fun startScene(sceneId: String, totalDurationMinutes: Int) = dispatch(Commands.startScene(sceneId, totalDurationMinutes))
    fun stopScene() = dispatch(Commands.stopScene)
    fun setSceneMacro(key: String, value: Float) = dispatch(Commands.setSceneMacro(key, value))
    fun setSceneDuration(minutes: Int) = dispatch(Commands.setSceneDuration(minutes))

    fun dispatchQuietly(command: SessionCommand) {
        val future = dispatch(command) ?: return
        Futures.addCallback(future, object : com.google.common.util.concurrent.FutureCallback<SessionResult> {
            override fun onSuccess(result: SessionResult?) {}
            override fun onFailure(t: Throwable) {}
        }, MoreExecutors.directExecutor())
    }
}
