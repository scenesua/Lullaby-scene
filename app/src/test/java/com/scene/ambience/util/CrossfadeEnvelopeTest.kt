package com.scene.ambience.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CrossfadeEnvelopeTest {

    @Test
    fun endpointsAreClean() {
        assertEquals(1f, CrossfadeEnvelope.outgoingGain(0f), 1e-6f)
        assertEquals(0f, CrossfadeEnvelope.incomingGain(0f), 1e-6f)
        assertEquals(0f, CrossfadeEnvelope.outgoingGain(1f), 1e-6f)
        assertEquals(1f, CrossfadeEnvelope.incomingGain(1f), 1e-6f)
    }

    @Test
    fun midpointsAreEqualPower() {
        assertEquals(CrossfadeEnvelope.incomingGain(0.5f), CrossfadeEnvelope.outgoingGain(0.5f), 1e-6f)
        assertEquals(Math.sqrt(0.5), CrossfadeEnvelope.outgoingGain(0.5f).toDouble(), 1e-6)
    }

    @Test
    fun powerSumIsAlwaysOne() {
        for (i in 0..100) {
            val t = i / 100f
            assertEquals("power sum at t=$t", 1.0, CrossfadeEnvelope.powerSum(t).toDouble(), 1e-4)
        }
    }

    @Test
    fun tIsClamped() {
        assertEquals(1f, CrossfadeEnvelope.outgoingGain(-1f), 1e-6f)
        assertEquals(0f, CrossfadeEnvelope.outgoingGain(2f), 1e-6f)
        assertTrue(CrossfadeEnvelope.powerSum(2f) > 0.99f)
    }

    @Test
    fun longFadesUseSmoothVolumeSteps() {
        assertEquals(80, CrossfadeEnvelope.stepsForDuration(2_000L))
        assertEquals(600, CrossfadeEnvelope.stepsForDuration(15_000L))
    }
}
