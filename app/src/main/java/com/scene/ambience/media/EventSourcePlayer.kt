package com.scene.ambience.media

import android.content.Context
import android.media.SoundPool
import com.scene.ambience.data.model.AudioAssetManifest
import com.scene.ambience.data.model.CategoryPresetConfig
import com.scene.ambience.util.EventScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
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
 *
 * Scheduling lifetime is deliberately separate from audibility. Muting a
 * source/master (or a temporary zero-gain fade) must not terminate the
 * scheduler job, otherwise unmuting would leave the event source permanently
 * silent until the player is recreated. Pause/stop still cancel the job via
 * [stopScheduling].
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
                // Skip unreadable event files. Manifest/instrumentation tests
                // should catch missing assets before release.
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
        // Volumes are read from volumeProvider at trigger time so mute/master
        // changes are reflected without rebuilding the SoundPool samples.
    }

    private suspend fun run() {
        // Do not use isActive() as the loop condition. That callback expresses
        // current audibility and legitimately becomes false during mute/fade.
        // Only coroutine cancellation (pause/stop/release/restart) owns the
        // lifetime of this scheduling loop.
        while (currentCoroutineContext().isActive) {
            val delayMs = EventScheduler.nextDelayMs(config.minIntervalMs, config.maxIntervalMs, random)
            delay(delayMs)

            // Preserve the random timeline while inaudible, but skip the actual
            // one-shot. A later unmute therefore resumes naturally without a
            // hidden scheduler restart requirement.
            if (!isActive()) continue
            if (sampleIds.isEmpty()) continue

            val idx = EventScheduler.nextSampleIndex(sampleIds.size, lastSample, random)
            if (idx < 0) continue
            lastSample = idx

            val baseVolume = volumeProvider().coerceIn(0f, 1f)
            if (baseVolume <= 0f) continue

            val vol = EventScheduler.randomVolume(
                config.eventVolumeRange.getOrElse(0) { 0.75 }.toFloat(),
                config.eventVolumeRange.getOrElse(1) { 1.0 }.toFloat(),
                random,
            ) * baseVolume
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
