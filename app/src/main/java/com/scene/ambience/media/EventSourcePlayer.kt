package com.scene.ambience.media

import android.content.Context
import android.media.SoundPool
import android.os.SystemClock
import com.scene.ambience.data.model.AudioAssetManifest
import com.scene.ambience.data.model.CategoryPresetConfig
import com.scene.ambience.util.EventScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * Short one-shot event player. Scheduling lifetime is separate from audibility:
 * mute/fade skips triggers without killing the coroutine, while pause/stop owns
 * cancellation. Per-asset weights and cooldowns keep transition sounds rare.
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

    private data class LoadedSample(
        val asset: AudioAssetManifest,
        val sampleId: Int,
    )

    private val random = Random(randomSeed ?: System.currentTimeMillis())
    private val samples = mutableListOf<LoadedSample>()
    private val lastPlayedAtMs = mutableMapOf<String, Long>()
    private var job: Job? = null
    private var lastSample = -1

    init {
        for (file in files) {
            try {
                val afd = context.assets.openFd(file.path)
                val id = soundPool.load(afd, 1)
                afd.close()
                if (id != 0) samples += LoadedSample(file, id)
            } catch (_: Exception) {
                // Manifest/instrumentation validation reports missing assets.
            }
        }
    }

    fun start() {
        job?.cancel()
        job = scope.launch { run() }
    }

    fun stopScheduling() {
        job?.cancel()
        job = null
    }

    fun release() {
        stopScheduling()
        samples.forEach { runCatching { soundPool.unload(it.sampleId) } }
        samples.clear()
        lastPlayedAtMs.clear()
    }

    fun applyBaseVolume(baseGain: Float) {
        // Read from volumeProvider at trigger time; no persistent stream exists.
    }

    private suspend fun run() {
        while (currentCoroutineContext().isActive) {
            delay(EventScheduler.nextDelayMs(config.minIntervalMs, config.maxIntervalMs, random))
            if (!isActive() || samples.isEmpty()) continue

            val now = SystemClock.elapsedRealtime()
            val cooldownEligible = samples.indices.filter { index ->
                val asset = samples[index].asset
                val previous = lastPlayedAtMs[asset.assetId] ?: Long.MIN_VALUE
                previous == Long.MIN_VALUE || now - previous >= asset.cooldownMs.coerceAtLeast(0L)
            }
            if (cooldownEligible.isEmpty()) continue

            val noImmediateRepeat = if (cooldownEligible.size > 1) {
                cooldownEligible.filterNot { it == lastSample }
            } else {
                cooldownEligible
            }
            val localIndex = EventScheduler.nextWeightedIndex(
                noImmediateRepeat.map { samples[it].asset.eventWeight.toFloat() },
                random,
            )
            if (localIndex < 0) continue
            val sampleIndex = noImmediateRepeat[localIndex]
            val sample = samples[sampleIndex]

            val baseVolume = volumeProvider().coerceIn(0f, 1f)
            if (baseVolume <= 0f) continue
            val volume = EventScheduler.randomVolume(
                config.eventVolumeRange.getOrElse(0) { 0.75 }.toFloat(),
                config.eventVolumeRange.getOrElse(1) { 1.0 }.toFloat(),
                random,
            ) * baseVolume
            val pan = EventScheduler.randomPan(
                config.eventPanRange.getOrElse(0) { -0.6 }.toFloat(),
                config.eventPanRange.getOrElse(1) { 0.6 }.toFloat(),
                random,
            )
            val (left, right) = panVolumes(volume, pan)
            val streamId = soundPool.play(sample.sampleId, left, right, 1, 0, 1f)
            if (streamId != 0) {
                lastSample = sampleIndex
                lastPlayedAtMs[sample.asset.assetId] = now
            }
        }
    }

    /** Equal-power pan split for [-1, 1] pan values. */
    private fun panVolumes(volume: Float, pan: Float): Pair<Float, Float> {
        val p = pan.coerceIn(-1f, 1f)
        val angle = (PI / 4.0 * (p + 1.0)).toFloat()
        return volume * cos(angle) to volume * sin(angle)
    }
}
