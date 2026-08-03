package com.scene.ambience

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.media3.session.MediaController
import androidx.media3.session.SessionResult
import androidx.media3.session.SessionToken
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.data.model.SourceState
import com.scene.ambience.media.AmbiencePlaybackService
import com.scene.ambience.media.Commands
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.ExecutionException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * End-to-end service test: a MediaController connects to
 * AmbiencePlaybackService, exercises custom commands and transport, and
 * reads the pushed engine snapshot back through session extras.
 *
 * All controller interactions run on the main looper (the controller's
 * application thread) via runBlocking(Dispatchers.Main); delays yield to
 * the looper so binder-delivered extras keep arriving.
 */
@RunWith(AndroidJUnit4::class)
class AmbiencePlaybackServiceTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val json = Json { ignoreUnknownKeys = true }

    private lateinit var controller: MediaController

    private suspend fun <T> ListenableFuture<T>.await(): T = suspendCancellableCoroutine { cont ->
        addListener(
            {
                if (cont.isActive) {
                    try {
                        cont.resume(get())
                    } catch (e: ExecutionException) {
                        cont.resumeWithException(e.cause ?: e)
                    }
                }
            },
            MoreExecutors.directExecutor(),
        )
        cont.invokeOnCancellation { cancel(false) }
    }

    @Before
    fun connect() = runBlocking(Dispatchers.Main) {
        val token = SessionToken(context, ComponentName(context, AmbiencePlaybackService::class.java))
        controller = MediaController.Builder(context, token).buildAsync().await()
        assertNotNull(controller)
    }

    @After
    fun tearDown() {
        if (::controller.isInitialized) {
            runBlocking(Dispatchers.Main) { controller.release() }
        }
    }

    private fun latestSnapshot(): EngineSnapshot? {
        val extras = controller.sessionExtras
        return Commands.parseSnapshot(extras)
    }

    private suspend fun waitForSnapshot(timeoutMs: Long = 15_000L, predicate: (EngineSnapshot) -> Boolean): EngineSnapshot {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val snapshot = latestSnapshot()
            if (snapshot != null && predicate(snapshot)) return snapshot
            delay(100L)
        }
        throw AssertionError("timeout waiting for snapshot")
    }

    @Test
    fun connectDeliversInitialSnapshot() = runBlocking(Dispatchers.Main) {
        context.stopService(Intent(context, AmbiencePlaybackService::class.java))
        controller.release()
        delay(1000L)
        val token = SessionToken(context, ComponentName(context, AmbiencePlaybackService::class.java))
        controller = MediaController.Builder(context, token).buildAsync().await()
        val snapshot = waitForSnapshot { true }
        assertEquals(PlaybackState.IDLE, snapshot.playbackState)
    }

    @Test
    fun masterVolumeCommandUpdatesSnapshot() = runBlocking(Dispatchers.Main) {
        val result = controller.sendCustomCommand(Commands.setMasterVolume(0.42f), Bundle()).await()
        assertEquals(SessionResult.RESULT_SUCCESS, result.resultCode)
        val snapshot = waitForSnapshot { it.masterVolume == 0.42f }
        assertEquals(0.42f, snapshot.masterVolume, 1e-5f)
    }

    @Test
    fun sourceVolumeAndMuteCommandsWork() = runBlocking(Dispatchers.Main) {
        val result = controller.sendCustomCommand(
            Commands.setSourceVolume("rain", 0.55f),
            Bundle(),
        ).await()
        assertEquals(SessionResult.RESULT_SUCCESS, result.resultCode)

        var snapshot = waitForSnapshot { it.sources["rain"]?.volume == 0.55f }
        assertEquals(0.55f, snapshot.sources["rain"]!!.volume, 1e-5f)

        controller.sendCustomCommand(
            Commands.setSourceMuted("rain", true),
            Bundle(),
        ).await()
        snapshot = waitForSnapshot { it.sources["rain"]?.muted == true }
        assertTrue(snapshot.sources["rain"]!!.muted)
    }

    @Test
    fun applyMixCommandSetsWholeMix() = runBlocking(Dispatchers.Main) {
        val mix = MixState(
            masterVolume = 0.66f,
            sources = mapOf(
                "rain" to SourceState(id = "rain", enabled = true, volume = 0.5f),
                "thunder" to SourceState(id = "thunder", enabled = true, volume = 0.2f),
            ),
        )
        val result = controller.sendCustomCommand(
            Commands.applyMix(json.encodeToString(MixState.serializer(), mix), "preset_test"),
            Bundle(),
        ).await()
        assertEquals(SessionResult.RESULT_SUCCESS, result.resultCode)

        val snapshot = waitForSnapshot {
            it.sources["rain"]?.enabled == true && it.sources["thunder"]?.enabled == true
        }
        assertEquals(0.66f, snapshot.masterVolume, 1e-5f)
        assertEquals(2, snapshot.activeSourceCount)
    }

    @Test
    fun playPauseStopFlowThroughPlayerCommands(): Unit = runBlocking(Dispatchers.Main) {
        controller.sendCustomCommand(
            Commands.applyMix(
                json.encodeToString(
                    MixState.serializer(),
                    MixState(
                        masterVolume = 0.5f,
                        sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.5f)),
                    ),
                ),
                null,
            ),
            Bundle(),
        ).await()

        assertTrue(
            "play/pause command must be available, got ${controller.availableCommands}",
            controller.isCommandAvailable(androidx.media3.common.Player.COMMAND_PLAY_PAUSE),
        )
        assertTrue(
            "stop command must be available",
            controller.isCommandAvailable(androidx.media3.common.Player.COMMAND_STOP),
        )
        controller.play()
        waitForSnapshot { it.playbackState == PlaybackState.PLAYING }

        controller.pause()
        waitForSnapshot { it.playbackState == PlaybackState.PAUSED }

        controller.stop()
        waitForSnapshot { it.playbackState == PlaybackState.STOPPED }
    }

    @Test
    fun sleepTimerCommandsFlowThrough(): Unit = runBlocking(Dispatchers.Main) {
        val result = controller.sendCustomCommand(
            Commands.startSleepTimer(5_000L, 500L),
            Bundle(),
        ).await()
        assertEquals(SessionResult.RESULT_SUCCESS, result.resultCode)

        val snapshot = waitForSnapshot { it.sleepTimerRemainingMs != null }
        assertTrue(snapshot.sleepTimerRemainingMs!! > 0L)

        controller.sendCustomCommand(Commands.cancelSleepTimer, Bundle()).await()
        waitForSnapshot { it.sleepTimerRemainingMs == null }
    }

    @Test
    fun unknownCommandReturnsError() = runBlocking(Dispatchers.Main) {
        val result = controller.sendCustomCommand(
            androidx.media3.session.SessionCommand("com.scene.ambience.cmd.nonexistent", Bundle()),
            Bundle(),
        ).await()
        assertTrue(
            "expected an error result code, got ${result.resultCode}",
            result.resultCode != SessionResult.RESULT_SUCCESS,
        )
    }

    @Test
    fun snapshotRoundTripsThroughBundle() = runBlocking(Dispatchers.Main) {
        val snapshot = latestSnapshot() ?: EngineSnapshot()
        val bundle = Commands.snapshotBundle(snapshot)
        val parsed = Commands.parseSnapshot(bundle)
        assertNotNull(parsed)
        assertEquals(snapshot.playbackState, parsed!!.playbackState)
        assertEquals(snapshot.masterVolume, parsed.masterVolume, 0f)
        assertEquals(snapshot.sources.size, parsed.sources.size)
    }

    @Test
    fun clearMessageCommandWorks() = runBlocking(Dispatchers.Main) {
        waitForSnapshot { true }
        controller.sendCustomCommand(Commands.clearMessage, Bundle()).await()
        assertEquals(null, latestSnapshot()?.message)
    }
}
