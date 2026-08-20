package com.scene.ambience.media

import android.content.Context
import android.media.SoundPool
import com.scene.ambience.data.model.AudioAssetManifest
import com.scene.ambience.data.model.CategoryPresetConfig
import com.scene.ambience.util.EventScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/**
 * Event-sound player: plays short one-shot samples from a shared SoundPool
 * at random (never fixed) intervals, with bounded volume and pan jitter
 * (section 23).
 */
class EventSourcePlayer(
    context: Context,
    val sourceId: String,
    private val files: List<AudioAssetManifest>,
    private val config: CategoryPresetConfig,
    private val soundPool: SoundPool,
    private val scope: CoroutineScope,
    randomSeed: Long? = null,
    private val volumeProvider: () -> Float,
    private val isActive: () -> Boolean,
) {

    private val random = Random(randomSeed ?: System.currentTimeMillis())
    private val sampleIds = mutableListOf<Int>()
    private var job: Job? = null
    private var lastSample = -1

    init {
        for (file in files) {
            try {
                val afd = context.assets.openFd(file.path)
                val id = soundPool.load(afd, 1)
                afd.close()
                if (id != 0) sampleIds.add(id)
            } catch (e: Exception) {
                // skip unreadable event file
            }
        }
    }

    fun start() {
        job?.cancel()
        job = scope.launch {
            run()
        }
    }

    fun stopScheduling() {
        job?.cancel()
        job = null
    }

    fun release() {
        stopScheduling()
        sampleIds.forEach { runCatching { soundPool.unload(it) } }
        sampleIds.clear()
    }

    fun applyBaseVolume(baseGain: Float) {
        // volumes are applied per trigger
    }

    private suspend fun run() {
        while (isActive()) {
            val delayMs = EventScheduler.nextDelayMs(config.minIntervalMs, config.maxIntervalMs, random)
            delay(delayMs)
            if (!isActive()) continue
            if (sampleIds.isEmpty()) continue
            val idx = EventScheduler.nextSampleIndex(sampleIds.size, lastSample, random)
            if (idx < 0) continue
            lastSample = idx
            val vol = EventScheduler.randomVolume(
                config.eventVolumeRange.getOrElse(0) { 0.75 }.toFloat(),
                config.eventVolumeRange.getOrElse(1) { 1.0 }.toFloat(),
                random,
            ) * volumeProvider()
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
