package com.scene.ambience

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.data.model.SourceState
import com.scene.ambience.media.AmbienceEngine
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
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Engine integration tests against the real packaged assets on a device. */
@RunWith(AndroidJUnit4::class)
class AmbienceEngineTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var engine: AmbienceEngine

    @Before
    fun setUp() {
        val application = context.applicationContext as AmbienceApplication
        engine = AmbienceEngine(
            context = context,
            library = application.libraryRepository.requireLibrary(),
            scope = scope,
            focusPolicyProvider = { FocusPolicy.PAUSE },
        )
    }

    @After
    fun tearDown() {
        engine.release()
        scope.cancel()
    }

    @Test
    fun stateFlowStartsEmpty() {
        val snapshot = engine.state.value
        assertEquals(PlaybackState.IDLE, snapshot.playbackState)
        assertTrue(snapshot.sources.isEmpty())
    }

    @Test
    fun applyingMixReflectsInSnapshot() = runBlocking {
        val mix = MixState(
            masterVolume = 0.6f,
            sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.5f)),
        )
        engine.applyMix(mix)
        val snapshot = engine.state.first { it.sources.containsKey("rain") }
        assertEquals(0.6f, snapshot.masterVolume, 1e-6f)
        assertEquals(0.5f, snapshot.sources["rain"]!!.volume, 1e-6f)
        assertEquals(PlaybackState.IDLE, snapshot.playbackState)
    }

    @Test
    fun playReachesPlayingAndPauseStops() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.5f)),
            )
        )
        engine.play()
        val playing = withTimeout(10_000L) {
            engine.state.first { it.playbackState == PlaybackState.PLAYING }
        }
        assertEquals(PlaybackState.PLAYING, playing.playbackState)

        engine.pause()
        val paused = withTimeout(10_000L) {
            engine.state.first { it.playbackState == PlaybackState.PAUSED }
        }
        assertEquals(PlaybackState.PAUSED, paused.playbackState)
    }

    @Test
    fun masterMuteSilencesAndUnmuteRestores() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("fan" to SourceState(id = "fan", enabled = true, volume = 0.5f)),
            )
        )
        engine.setMasterMuted(true)
        assertEquals(0f, engine.sourceGain("fan"), 0f)

        engine.setMasterMuted(false)
        assertTrue("gain restored", engine.sourceGain("fan") > 0f)
    }

    @Test
    fun sourceVolumeZeroDisablesPlayer() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("fan" to SourceState(id = "fan", enabled = true, volume = 0.3f)),
            )
        )
        engine.play()
        withTimeout(10_000L) { engine.state.first { it.playbackState == PlaybackState.PLAYING } }

        engine.setSourceVolume("fan", 0f)
        var snapshot = engine.state.value
        var state = snapshot.sources["fan"]
        assertNotNull(state)
        assertEquals(0f, state!!.volume, 0f)
        assertEquals(false, state.enabled)
        assertEquals(0, snapshot.activeSourceCount)
        assertEquals(0f, engine.sourceGain("fan"), 0f)

        engine.setSourceVolume("fan", 0.4f)
        snapshot = engine.state.value
        state = snapshot.sources["fan"]
        assertNotNull(state)
        assertTrue("source is re-enabled above zero volume", state!!.enabled)
        assertEquals(0.4f, state.volume, 0f)
        assertEquals(1, snapshot.activeSourceCount)
        assertEquals(PlaybackState.PLAYING, snapshot.playbackState)
        assertTrue("gain restored", engine.sourceGain("fan") > 0f)
    }

    @Test
    fun mutePreservesVolumeAndDoesNotDisable() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("fan" to SourceState(id = "fan", enabled = true, volume = 0.6f)),
            )
        )
        engine.play()
        withTimeout(10_000L) { engine.state.first { it.playbackState == PlaybackState.PLAYING } }

        engine.setSourceMuted("fan", true)
        var snapshot = engine.state.value
        var state = snapshot.sources["fan"]
        assertNotNull(state)
        assertTrue("muted source stays enabled", state!!.enabled)
        assertEquals(0.6f, state.volume, 0f)
        assertEquals(1, snapshot.activeSourceCount)
        assertEquals(0f, engine.sourceGain("fan"), 0f)

        engine.setSourceMuted("fan", false)
        snapshot = engine.state.value
        state = snapshot.sources["fan"]
        assertTrue("unmuted source stays enabled", state!!.enabled)
        assertEquals(0.6f, state.volume, 0f)
        assertTrue("gain restored", engine.sourceGain("fan") > 0f)
    }

    @Test
    fun sleepTimerStopsPlayback() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.5f)),
            )
        )
        engine.play()
        withTimeout(10_000L) { engine.state.first { it.playbackState == PlaybackState.PLAYING } }

        engine.startSleepTimer(durationMs = 1500L, fadeMs = 300L)
        val snapshot = withTimeout(15_000L) {
            engine.state.first { it.sleepTimerRemainingMs != null }
        }
        assertTrue(snapshot.sleepTimerRemainingMs!! > 0L)

        val stopped = withTimeout(20_000L) {
            engine.state.first { it.playbackState == PlaybackState.STOPPED || it.playbackState == PlaybackState.IDLE }
        }
        assertTrue("timer stopped playback", stopped.playbackState == PlaybackState.STOPPED)
    }

    @Test
    fun cancelSleepTimerKeepsPlaying() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.5f)),
            )
        )
        engine.play()
        withTimeout(10_000L) { engine.state.first { it.playbackState == PlaybackState.PLAYING } }

        engine.startSleepTimer(durationMs = 5000L, fadeMs = 200L)
        engine.cancelSleepTimer()
        delay(700L)
        assertTrue(engine.state.value.sleepTimerRemainingMs == null)
        assertEquals(PlaybackState.PLAYING, engine.state.value.playbackState)
    }

    @Test
    fun stoppingResetsToStopped() = runBlocking {
        engine.applyMix(
            MixState(
                masterVolume = 0.5f,
                sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.4f)),
            )
        )
        engine.play()
        withTimeout(10_000L) { engine.state.first { it.playbackState == PlaybackState.PLAYING } }
        engine.stop()
        withTimeout(10_000L) { engine.state.first { it.playbackState == PlaybackState.STOPPED } }
        assertTrue(engine.snapshot().sleepTimerRemainingMs == null)
    }

    @Test
    fun playWithoutSourcesReportsMessage() = runBlocking {
        engine.play()
        val snapshot = withTimeout(5_000L) {
            engine.state.first { it.message == "no_active_sources" }
        }
        assertEquals(PlaybackState.IDLE, snapshot.playbackState)
    }

    @Test
    fun generatedNoiseAndCricketsUseIndependentSourceState() = runBlocking {
        val ids = listOf("white_noise", "pink_noise", "brown_noise", "crickets")
        engine.applyMix(MixState(sources = ids.associateWith { SourceState(it, enabled = true, volume = 0.3f) }))
        engine.play()
        withTimeout(10_000L) { engine.state.first { it.playbackState == PlaybackState.PLAYING } }
        assertEquals(4, engine.snapshot().activeSourceCount)
        ids.forEach { assertTrue("$it has gain", engine.sourceGain(it) > 0f) }

        engine.setSourceVolume("white_noise", 0f)
        assertEquals(3, engine.snapshot().activeSourceCount)
        assertEquals(0f, engine.sourceGain("white_noise"), 0f)
        ids.drop(1).forEach { assertTrue("$it remains active", engine.sourceGain(it) > 0f) }
    }

    @Test
    fun trainTrimGainIsThreeDbAboveUntrimmedSource() {
        fun gainFor(id: String): Float {
            engine.applyMix(MixState(masterVolume = 0.5f, sources = mapOf(id to SourceState(id, true, 0.3f))))
            return engine.sourceGain(id)
        }
        val train = gainFor("train")
        val rain = gainFor("rain")
        assertEquals(1.4125f, train / rain, 0.002f)
        assertTrue("trimmed gain remains within ExoPlayer range", train <= 1f)
    }
}
