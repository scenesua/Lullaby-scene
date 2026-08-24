package com.scene.ambience.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class JourneyCrossfadeTest {
    @Test
    fun `crossfade overlaps smoothly around a journey boundary`() {
        assertEquals("before fade", 1f to 0f, journeyCrossfade(1_000L, 10_000L))
        val middle = journeyCrossfade(6_000L, 10_000L)
        assertTrue(middle.first in 0.70f..0.71f)
        assertTrue(middle.second in 0.70f..0.71f)
        assertEquals("at boundary", 0f to 1f, journeyCrossfade(10_000L, 10_000L))
    }
}
