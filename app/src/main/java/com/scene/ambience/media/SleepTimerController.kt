package com.scene.ambience.media

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Sleep timer owned by the playback service. Fades volumes over [fadeMs]
 * before finishing, so a fade can outlive the nominal countdown. Timeout
 * fades are never cut off; cancelling during a fade restores it smoothly.
 */
class SleepTimerController(
    private val engine: AmbienceEngine,
    private val scope: CoroutineScope,
) {

    var remainingMs: Long? = null
        private set

    private var endEpochMs: Long? = null
    private var fadeMs: Long = 0L
    private var tickJob: Job? = null
    private var fadeJob: Job? = null
    private var fading = false
    private var finished = false

    fun start(durationMs: Long, fadeMs: Long) {
        cancel()
        if (durationMs <= 0L) return
        this.fadeMs = fadeMs.coerceAtLeast(0L)
        endEpochMs = System.currentTimeMillis() + durationMs
        remainingMs = durationMs
        engine.onTimerRemaining(durationMs)
        tickJob = scope.launch { tick() }
    }

    /** Restore a timer that was persisted in settings across process death. */
    fun restore(endEpochMs: Long, fadeMs: Long) {
        val now = System.currentTimeMillis()
        if (endEpochMs <= now) return
        this.fadeMs = fadeMs.coerceAtLeast(0L)
        this.endEpochMs = endEpochMs
        remainingMs = endEpochMs - now
        engine.onTimerRemaining(remainingMs)
        tickJob = scope.launch { tick() }
    }

    fun cancel() {
        val wasRunning = endEpochMs != null
        tickJob?.cancel()
        tickJob = null
        fadeJob?.cancel()
        fadeJob = null
        endEpochMs = null
        remainingMs = null
        fading = false
        finished = false
        if (wasRunning) engine.onTimerRemaining(null)
        if (wasFading) {
            wasFading = false
            engine.restoreSleepFade()
        }
    }

    fun isActive(): Boolean = endEpochMs != null

    private var wasFading = false

    private suspend fun tick() {
        while (kotlin.coroutines.coroutineContext.isActive) {
            val end = endEpochMs ?: return
            val now = System.currentTimeMillis()
            val remaining = end - now
            if (remaining <= 0L) {
                finishFade()
                return
            }
            remainingMs = remaining
            if (!fading && fadeMs > 0L && remaining <= fadeMs) {
                fading = true
                wasFading = true
                startFade(remaining.toFloat() / fadeMs)
            }
            // A one-second UI cadence is sufficient for a countdown and halves
            // MediaSession snapshot traffic compared with the old 500 ms tick.
            engine.onTimerRemaining(remaining)
            delay(1_000L)
        }
    }

    private fun startFade(startFrac: Float) {
        fadeJob?.cancel()
        fadeJob = scope.launch {
            val steps = 20
            var t = startFrac
            while (t > 0f && isActive) {
                engine.setSleepFade(t)
                t -= 1f / steps
                delay((fadeMs / steps).coerceAtLeast(10L))
            }
            engine.setSleepFade(0f)
            finishFade()
        }
    }

    private fun finishFade() {
        if (finished) return
        finished = true
        fading = false
        wasFading = false
        endEpochMs = null
        remainingMs = null
        engine.onTimerFinished()
    }
}
