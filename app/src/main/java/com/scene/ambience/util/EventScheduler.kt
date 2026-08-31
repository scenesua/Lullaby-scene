package com.scene.ambience.util

import kotlin.random.Random

/** Random event timing and selection helpers. Pure logic, unit-testable. */
object EventScheduler {

    /** Ordered pentatonic notes: prefer nearby tones, with no immediate repeat. */
    fun melodicWeight(index: Int, previous: Int): Float = when {
        previous < 0 -> 1f
        index == previous -> 0f
        kotlin.math.abs(index - previous) == 1 -> 4f
        kotlin.math.abs(index - previous) == 2 -> 2f
        else -> 1f
    }

    fun rainDrumDelayMs(random: Random): Long = nextDelayMs(900L, 3800L, random) +
        if (random.nextFloat() < .12f) nextDelayMs(1800L, 2600L, random) else 0L

    /** Next trigger delay in ms, uniformly random in [minMs, maxMs]. */
    fun nextDelayMs(minMs: Long, maxMs: Long, random: Random = Random.Default): Long {
        if (maxMs <= minMs) return minMs.coerceAtLeast(0L)
        return random.nextLong(minMs, maxMs + 1L)
    }

    /** Pick a non-repeating sample uniformly. Retained for legacy tests/callers. */
    fun nextSampleIndex(poolSize: Int, lastIndex: Int, random: Random = Random.Default): Int {
        if (poolSize <= 0) return -1
        if (poolSize == 1) return 0
        var idx = random.nextInt(poolSize)
        while (idx == lastIndex) idx = random.nextInt(poolSize)
        return idx
    }

    /**
     * Weighted selection over the provided local pool. Non-positive weights are
     * treated as disabled. Returns -1 when nothing is selectable.
     */
    fun nextWeightedIndex(weights: List<Float>, random: Random = Random.Default): Int {
        if (weights.isEmpty()) return -1
        val sanitized = weights.map { it.coerceAtLeast(0f) }
        val total = sanitized.sum()
        if (total <= 0f) return -1
        var cursor = random.nextFloat() * total
        sanitized.forEachIndexed { index, weight ->
            cursor -= weight
            if (cursor < 0f) return index
        }
        return sanitized.lastIndex
    }

    /** Random volume in [minV, maxV]. */
    fun randomVolume(minV: Float, maxV: Float, random: Random = Random.Default): Float {
        if (maxV <= minV) return minV
        return minV + random.nextFloat() * (maxV - minV)
    }

    /** Random pan in [minPan, maxPan]. */
    fun randomPan(minPan: Float, maxPan: Float, random: Random = Random.Default): Float {
        if (maxPan <= minPan) return minPan
        return minPan + random.nextFloat() * (maxPan - minPan)
    }
}
