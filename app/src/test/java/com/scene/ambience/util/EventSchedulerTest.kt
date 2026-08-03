package com.scene.ambience.util

import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EventSchedulerTest {

    @Test
    fun delaysStayWithinBounds() {
        val random = Random(42)
        repeat(500) {
            val d = EventScheduler.nextDelayMs(5_000L, 60_000L, random)
            assertTrue("delay $d", d in 5_000L..60_000L)
        }
    }

    @Test
    fun delayWhenRangeInvertedReturnsMinParam() {
        assertEquals(60_000L, EventScheduler.nextDelayMs(60_000L, 3_000L))
    }

    @Test
    fun singleSamplePoolReturnsZero() {
        assertEquals(0, EventScheduler.nextSampleIndex(1, 0, Random(1)))
        assertEquals(-1, EventScheduler.nextSampleIndex(0, -1, Random(1)))
    }

    @Test
    fun neverRepeatsLastSample() {
        val random = Random(7)
        var last = 2
        repeat(200) {
            val idx = EventScheduler.nextSampleIndex(4, last, random)
            assertTrue("must avoid $last", idx != last)
            last = idx
        }
    }

    @Test
    fun volumesStayWithinRange() {
        val random = Random(9)
        repeat(500) {
            val v = EventScheduler.randomVolume(0.3f, 0.9f, random)
            assertTrue("volume $v", v >= 0.3f && v <= 0.9f)
        }
    }

    @Test
    fun pansStayWithinRange() {
        val random = Random(11)
        repeat(500) {
            val p = EventScheduler.randomPan(-0.6f, 0.6f, random)
            assertTrue("pan $p", p >= -0.6f && p <= 0.6f)
        }
    }
}
