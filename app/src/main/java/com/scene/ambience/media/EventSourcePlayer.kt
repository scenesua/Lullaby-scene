package com.scene.ambience.media

import android.content.Context
import android.media.SoundPool
import android.os.SystemClock
import com.scene.ambience.data.model.AudioAssetManifest
import com.scene.ambience.data.model.CategoryPresetConfig
import com.scene.ambience.util.EventScheduler
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
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
 * Optional one-shot selection used by scene-authored causal sequences that need
 * a specific asset from a multi-variant event source. A missing requested asset
 * fails the trigger instead of silently falling back to an unrelated variant.
 */
internal object ManualEventAssetSelection {
    private val pendingAssetIds = ConcurrentHashMap<String, String>()

    fun select(sourceId: String, assetId: String) {
        pendingAssetIds[sourceId] = assetId
    }

    fun consume(sourceId: String): String? = pendingAssetIds.remove(sourceId)
}

/**
 * Short one-shot event player. Asset descriptors are opened on Dispatchers.IO,
 * so enabling a source never synchronously walks packaged audio on the service
 * thread. Per-asset weights/cooldowns remain intact and the final source gain is
 * cached through applyBaseVolume instead of re-entering AmbienceEngine at every
 * trigger.
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

    private val appContext = context.applicationContext
    private val random = Random(randomSeed ?: System.currentTimeMillis())
    private val samples = CopyOnWriteArrayList<LoadedSample>()
    private val lastPlayedAtMs = mutableMapOf<String, Long>()
    private var job: Job? = null
    private var loadJob: Job? = null
    private var lastSample = -1

    @Volatile private var baseGain = volumeProvider().coerceIn(0f, 1f)
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
            samples += LoadedSample(file, id)
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
        released = true
        stopScheduling()
        loadJob?.cancel()
        loadJob = null
        samples.forEach { runCatching { soundPool.unload(it.sampleId) } }
        samples.clear()
        lastPlayedAtMs.clear()
        ManualEventAssetSelection.consume(sourceId)
    }

    fun applyBaseVolume(baseGain: Float) {
        this.baseGain = baseGain.coerceIn(0f, 1f)
    }

    /** Play one loaded event immediately for scene-authored causal sequences. */
    fun triggerNow(volumeScale: Float = 1f, pan: Float = 0f): Boolean {
        if (released || !isActive()) return false
        val preferredAssetId = ManualEventAssetSelection.consume(sourceId)
        val sampleIndex = if (preferredAssetId != null) {
            samples.indexOfFirst { it.asset.assetId == preferredAssetId }
                .takeIf { it >= 0 }
                ?: return false
        } else {
            val choices = samples.indices.filterNot { samples.size > 1 && it == lastSample }
            choices.randomOrNull(random) ?: return false
        }
        val sample = samples[sampleIndex]
        val volume = (baseGain * volumeScale).coerceIn(0f, 1f)
        if (volume <= 0f) return false
        val (left, right) = panVolumes(volume, pan)
        val streamId = soundPool.play(sample.sampleId, left, right, 1, 0, 1f)
        if (streamId != 0) {
            lastSample = sampleIndex
            lastPlayedAtMs[sample.asset.assetId] = SystemClock.elapsedRealtime()
            return true
        }
        return false
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

            val currentGain = baseGain
            if (currentGain <= 0f) continue
            val volume = EventScheduler.randomVolume(
                config.eventVolumeRange.getOrElse(0) { 0.75 }.toFloat(),
                config.eventVolumeRange.getOrElse(1) { 1.0 }.toFloat(),
                random,
            ) * currentGain
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
