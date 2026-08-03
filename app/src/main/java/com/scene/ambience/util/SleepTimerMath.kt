package com.scene.ambience.util

/** Sleep timer arithmetic, pure and unit-testable. */
object SleepTimerMath {

    /** Remaining ms at [nowMs] given the end deadline; null when the timer is not running. */
    fun remainingMs(endEpochMs: Long?, nowMs: Long): Long? {
        if (endEpochMs == null) return null
        return (endEpochMs - nowMs).coerceAtLeast(0L)
    }

    /** Progress 0..1 of the fade at [nowMs] between [fadeStartMs] and [fadeEndMs]. */
    fun fadeProgress(nowMs: Long, fadeStartMs: Long, fadeEndMs: Long): Float {
        if (fadeEndMs <= fadeStartMs) return 1f
        return ((nowMs - fadeStartMs).toFloat() / (fadeEndMs - fadeStartMs).toFloat()).coerceIn(0f, 1f)
    }

    /** Fade gain at a given progress - equal-power reverse is overkill; linear is smooth enough. */
    fun fadeGain(progress: Float): Float = (1f - progress.coerceIn(0f, 1f))
}
