package com.scene.ambience.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SleepTimerMathTest {

    @Test
    fun remainingMsIsNullWhenNoTimer() {
        assertNull(SleepTimerMath.remainingMs(null, 1000L))
    }

    @Test
    fun remainingMsCountsDownToZero() {
        assertEquals(40_000L, SleepTimerMath.remainingMs(50_000L, 10_000L))
        assertEquals(0L, SleepTimerMath.remainingMs(10_000L, 20_000L))
        assertEquals(0L, SleepTimerMath.remainingMs(10_000L, 10_000L))
    }

    @Test
    fun fadeProgressClamps() {
        assertEquals(0f, SleepTimerMath.fadeProgress(0L, 10_000L, 20_000L), 0f)
        assertEquals(0.5f, SleepTimerMath.fadeProgress(15_000L, 10_000L, 20_000L), 1e-6f)
        assertEquals(1f, SleepTimerMath.fadeProgress(99_000L, 10_000L, 20_000L), 0f)
        assertEquals(1f, SleepTimerMath.fadeProgress(5L, 10_000L, 5_000L), 0f)
    }

    @Test
    fun fadeGainStartsFullEndsZero() {
        assertEquals(1f, SleepTimerMath.fadeGain(0f), 0f)
        assertEquals(0.5f, SleepTimerMath.fadeGain(0.5f), 1e-6f)
        assertEquals(0f, SleepTimerMath.fadeGain(1f), 0f)
    }
}
