package com.scene.ambience.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class VolumeCurveTest {

    @Test
    fun linearToGain_isMonotonic() {
        var prev = 0f
        for (i in 0..100) {
            val v = i / 100f
            val g = VolumeCurve.linearToGain(v)
            assertTrue("gain at $v must not drop", g >= prev - 1e-6f)
            prev = g
        }
    }

    @Test
    fun linearToGain_respectsExponent() {
        assertEquals(0f, VolumeCurve.linearToGain(0f), 1e-6f)
        assertEquals(1f, VolumeCurve.linearToGain(1f), 1e-6f)
        assertEquals(0.25f, VolumeCurve.linearToGain(0.5f, 2f), 1e-4f)
    }

    @Test
    fun gainToLinear_isInverse() {
        for (i in 1..100) {
            val v = i / 100f
            assertEquals(v, VolumeCurve.gainToLinear(VolumeCurve.linearToGain(v)), 1e-3f)
        }
    }

    @Test
    fun combinedGain_mutedForcesZero() {
        val g = VolumeCurve.combinedGain(
            sourceVolume = 0.8f, sourceMuted = true,
            masterVolume = 0.8f, masterMuted = false,
        )
        assertEquals(0f, g, 0f)
    }

    @Test
    fun combinedGain_masterMutedForcesZero() {
        val g = VolumeCurve.combinedGain(
            sourceVolume = 0.8f, sourceMuted = false,
            masterVolume = 0.8f, masterMuted = true,
        )
        assertEquals(0f, g, 0f)
    }

    @Test
    fun combinedGain_normalizationPreventsClipBuildUp() {
        val single = VolumeCurve.combinedGain(
            sourceVolume = 1f, sourceMuted = false,
            masterVolume = 1f, masterMuted = false,
            activeSourceCount = 1,
        )
        val four = VolumeCurve.combinedGain(
            sourceVolume = 1f, sourceMuted = false,
            masterVolume = 1f, masterMuted = false,
            activeSourceCount = 4,
        )
        assertEquals(0.5f, four / single, 1e-4f)
    }

    @Test
    fun combinedGain_sleepFadeAndDuckApply() {
        val base = VolumeCurve.combinedGain(
            sourceVolume = 1f, sourceMuted = false,
            masterVolume = 1f, masterMuted = false,
            activeSourceCount = 1,
        )
        val faded = VolumeCurve.combinedGain(
            sourceVolume = 1f, sourceMuted = false,
            masterVolume = 1f, masterMuted = false,
            sleepFade = 0.5f, activeSourceCount = 1,
        )
        assertEquals(0.5f, faded / base, 1e-4f)
    }

    @Test
    fun percentConversions() {
        assertEquals(0f, VolumeCurve.percentToLinear(0f), 0f)
        assertEquals(0.5f, VolumeCurve.percentToLinear(50f), 1e-6f)
        assertEquals(1f, VolumeCurve.percentToLinear(200f), 0f)
        assertEquals(50, VolumeCurve.linearToPercent(0.5f))
    }
}
