package com.scene.ambience.util

import kotlin.random.Random

/**
 * Random (never fixed) interval scheduler for event sounds (section 23).
 * Pure logic, unit-testable.
 */
object EventScheduler {

    /** Next trigger delay in ms, uniformly random in [minMs, maxMs]. */
    fun nextDelayMs(minMs: Long, maxMs: Long, random: Random = Random.Default): Long {
        if (maxMs <= minMs) return minMs.coerceAtLeast(0L)
        return random.nextLong(minMs, maxMs + 1L)
    }

    /**
     * Pick the next sample avoiding the previous one when possible.
     * Returns index into [pool]; -1 when the pool is empty.
     */
    fun nextSampleIndex(poolSize: Int, lastIndex: Int, random: Random = Random.Default): Int {
        if (poolSize <= 0) return -1
        if (poolSize == 1) return 0
        var idx = random.nextInt(poolSize)
        while (idx == lastIndex) {
            idx = random.nextInt(poolSize)
        }
        return idx
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
