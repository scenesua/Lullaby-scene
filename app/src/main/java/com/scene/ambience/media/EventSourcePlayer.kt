package com.scene.ambience.media

import android.content.Context
import android.media.SoundPool
import com.scene.ambience.data.model.AudioAssetManifest
import com.scene.ambience.data.model.CategoryPresetConfig
import com.scene.ambience.util.EventScheduler
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Event-sound player: plays short one-shot samples from a shared SoundPool
 * at random (never fixed) intervals, with bounded volume and pan jitter.
 *
 * Asset descriptors are opened on Dispatchers.IO so enabling an event source never
 * blocks the service/UI thread. Runtime gain and active state are cached locally instead
 * of crossing back into AmbienceEngine from the scheduler coroutine.
 */
class EventSourcePlayer(
    context: Context,
    val sourceId: String,
    private val files: List<AudioAssetManifest>,
    private val config: CategoryPresetConfig,
    private val soundPool: SoundPool,
    private val scope: CoroutineScope,
    randomSeed: Long? = null,
    initialBaseGain: Float = 0f,
) {

    private val appContext = context.applicationContext
    private val random = Random(randomSeed ?: System.currentTimeMillis())
    private val sampleIds = CopyOnWriteArrayList<Int>()
    private var job: Job? = null
    private var loadJob: Job? = null
    private var lastSample = -1

    @Volatile private var baseGain = initialBaseGain.coerceIn(0f, 1f)
    @Volatile private var active = false
    @Volatile private var released = false

    init {
        loadJob = scope.launch(Dispatchers.IO) { loadSamples() }
    }

    private fun loadSamples() {
        for (file in files) {
            if (released) return
            val id = try {
                appContext.assets.openFd(file.path).use { afd -> soundPool.load(afd, 1) }
            } catch (_: Exception) {
                0
            }
            if (id == 0) continue
            if (released) {
                runCatching { soundPool.unload(id) }
                return
            }
            sampleIds.add(id)
        }
    }

    fun start() {
        active = true
        job?.cancel()
        job = scope.launch { run() }
    }

    fun stopScheduling() {
        active = false
        job?.cancel()
        job = null
    }

    fun release() {
        released = true
        stopScheduling()
        loadJob?.cancel()
        loadJob = null
        sampleIds.forEach { runCatching { soundPool.unload(it) } }
        sampleIds.clear()
    }

    fun applyBaseVolume(baseGain: Float) {
        this.baseGain = baseGain.coerceIn(0f, 1f)
    }

    private suspend fun run() {
        while (active && kotlin.coroutines.coroutineContext.isActive) {
            val delayMs = EventScheduler.nextDelayMs(config.minIntervalMs, config.maxIntervalMs, random)
            delay(delayMs)
            if (!active || !kotlin.coroutines.coroutineContext.isActive) continue
            if (sampleIds.isEmpty()) continue
            val idx = EventScheduler.nextSampleIndex(sampleIds.size, lastSample, random)
            if (idx < 0 || idx >= sampleIds.size) continue
            lastSample = idx
            val vol = EventScheduler.randomVolume(
                config.eventVolumeRange.getOrElse(0) { 0.75 }.toFloat(),
                config.eventVolumeRange.getOrElse(1) { 1.0 }.toFloat(),
                random,
            ) * baseGain
            val pan = EventScheduler.randomPan(
                config.eventPanRange.getOrElse(0) { -0.6 }.toFloat(),
                config.eventPanRange.getOrElse(1) { 0.6 }.toFloat(),
                random,
            )
            val (left, right) = panVolumes(vol, pan)
            soundPool.play(sampleIds[idx], left, right, 1, 0, 1f)
        }
    }

    /** Equal-power pan split for [-1, 1] pan values. */
    private fun panVolumes(volume: Float, pan: Float): Pair<Float, Float> {
        val p = pan.coerceIn(-1f, 1f)
        val angle = (PI / 4.0 * (p + 1.0)).toFloat()
        return volume * cos(angle) to volume * sin(angle)
    }
}
