package com.scene.ambience.util

import kotlin.random.Random

/**
 * Continuous-loop file selection: never repeats the same file consecutively,
 * and varies the start offset to reduce repetition fatigue (section 21).
 */
class FilePicker(private val random: Random = Random.Default) {

    private var lastIndex: Int = -1

    fun reset() {
        lastIndex = -1
    }

    /** Index of the next file, avoiding [lastIndex] when the pool allows. */
    fun nextIndex(poolSize: Int): Int = EventScheduler.nextSampleIndex(poolSize, lastIndex, random).also {
        if (it >= 0) lastIndex = it
    }

    /**
     * Random start offset in ms for a file of [durationMs], leaving at least
     * [reserveMs] of playable content at the end for the crossfade.
     */
    fun startOffsetMs(durationMs: Long, reserveMs: Long, random: Random = this.random): Long {
        if (durationMs <= reserveMs || durationMs <= 0) return 0L
        val maxStart = durationMs - reserveMs
        return random.nextLong(0L, maxStart + 1L)
    }
}
