package com.scene.ambience

import android.content.Context
import androidx.media3.common.Player
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.SourceState
import com.scene.ambience.media.AmbienceEngine
import com.scene.ambience.media.AmbienceSessionPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** The Media3 player façade must mirror engine state and forward transport calls. */
@RunWith(AndroidJUnit4::class)
class AmbienceSessionPlayerTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var engine: AmbienceEngine
    private lateinit var player: AmbienceSessionPlayer

    @Before
    fun setUp() {
        val application = context.applicationContext as AmbienceApplication
        engine = AmbienceEngine(
            context = context,
            library = application.libraryRepository.requireLibrary(),
            scope = scope,
            focusPolicyProvider = { FocusPolicy.PAUSE },
        )
        player = AmbienceSessionPlayer(engine)
    }

    @After
    fun tearDown() {
        player.release()
        engine.release()
        scope.cancel()
    }

    @Test
    fun initialPlayerStateIsIdle() {
        assertEquals(Player.STATE_IDLE, player.playbackState)
        assertEquals(false, player.playWhenReady)
    }

    @Test
    fun setPlayWhenReadyDrivesEngine() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.4f)),
            )
        )
        player.setPlayWhenReady(true)
        withTimeout(10_000L) { engine.state.first { it.playbackState == com.scene.ambience.data.model.PlaybackState.PLAYING } }
        withTimeout(10_000L) { while (player.playbackState != Player.STATE_READY) delay(50L) }
        assertEquals(Player.STATE_READY, player.playbackState)
        assertTrue(player.playWhenReady)
        assertTrue(player.isPlaying)
    }

    @Test
    fun pauseMapsToReadyNotPlaying() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.4f)),
            )
        )
        player.setPlayWhenReady(true)
        withTimeout(10_000L) { while (player.playbackState != Player.STATE_READY) delay(50L) }

        player.pause()
        withTimeout(10_000L) { engine.state.first { it.playbackState == com.scene.ambience.data.model.PlaybackState.PAUSED } }
        withTimeout(10_000L) {
            while (player.playWhenReady) delay(50L)
        }
        assertEquals(Player.STATE_READY, player.playbackState)
        assertEquals(false, player.playWhenReady)
        assertEquals(false, player.isPlaying)
    }

    @Test
    fun stopMapsToIdle() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.4f)),
            )
        )
        player.setPlayWhenReady(true)
        withTimeout(10_000L) { while (player.playbackState != Player.STATE_READY) delay(50L) }

        player.stop()
        withTimeout(10_000L) { while (player.playbackState != Player.STATE_IDLE) delay(50L) }
        withTimeout(10_000L) { while (player.playWhenReady) delay(50L) }
        assertEquals(Player.STATE_IDLE, player.playbackState)
        assertEquals(false, player.playWhenReady)
    }

    @Test
    fun volumeCommandsForwardToEngine() = runBlocking {
        player.setVolume(0.33f)
        assertEquals(0.33f, player.volume, 1e-5f)
        assertEquals(0.33f, engine.snapshot().masterVolume, 1e-5f)

        player.mute()
        assertTrue(engine.snapshot().masterMuted)
        player.unmute()
        assertEquals(false, engine.snapshot().masterMuted)
    }

    @Test
    fun timelineIsStaticSingleWindow() {
        assertEquals(1, player.currentTimeline.windowCount)
        assertEquals(1, player.mediaItemCount)
        assertEquals(Player.REPEAT_MODE_OFF, player.repeatMode)
        assertEquals(false, player.shuffleModeEnabled)
        assertEquals(-9223372036854775807L, player.duration)
        assertTrue(player.availableCommands.contains(Player.COMMAND_PLAY_PAUSE))
        assertTrue(player.availableCommands.contains(Player.COMMAND_STOP))
    }
}
