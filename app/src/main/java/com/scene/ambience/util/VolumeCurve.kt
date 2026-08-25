package com.scene.ambience.util

import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Perceptual volume math shared by the engine and the UI.
 *
 * Sliders work in linear 0..1; players receive gains on a perceptual curve.
 */
object VolumeCurve {

    /** Map a linear slider value (0..1) to a gain value (0..1). */
    fun linearToGain(volume: Float, exponent: Float = CURVE_EXPONENT): Float {
        val v = volume.coerceIn(0f, 1f)
        if (v <= 0f) return 0f
        return v.pow(exponent)
    }

    /** Inverse of [linearToGain]; used by tests and round-trips. */
    fun gainToLinear(gain: Float, exponent: Float = CURVE_EXPONENT): Float {
        val g = gain.coerceIn(0f, 1f)
        if (g <= 0f) return 0f
        return g.pow(1f / exponent)
    }

    fun percentToLinear(percent: Float): Float = (percent / 100f).coerceIn(0f, 1f)

    fun linearToPercent(volume: Float): Int = (volume.coerceIn(0f, 1f) * 100f).roundToIntSafe()

    private fun Float.roundToIntSafe(): Int = Math.round(this)

    /**
     * Combine source and master gains. Any muted flag forces zero.
     * The mix normalization keeps many simultaneous sources from clipping:
     * total output scales with 1/sqrt(activeSources).
     */
    fun combinedGain(
        sourceVolume: Float,
        sourceMuted: Boolean,
        masterVolume: Float,
        masterMuted: Boolean,
        crossfadeEnvelope: Float = 1f,
        sleepFade: Float = 1f,
        focusDuck: Float = 1f,
        activeSourceCount: Int = 1,
        mixNormalization: Boolean = true,
    ): Float {
        if (sourceMuted || masterMuted) return 0f
        val norm = if (mixNormalization && activeSourceCount > 1) {
            1f / sqrt(activeSourceCount.toFloat())
        } else {
            1f
        }
        val base =
            linearToGain(sourceVolume) *
                linearToGain(masterVolume) *
                norm
        return base * crossfadeEnvelope * sleepFade * focusDuck
    }

    /** One-shot scene events are never simultaneous mix beds, so keep their source control linear. */
    fun eventGain(
        sourceVolume: Float,
        sourceMuted: Boolean,
        masterVolume: Float,
        masterMuted: Boolean,
        sleepFade: Float = 1f,
        focusDuck: Float = 1f,
    ): Float {
        if (sourceMuted || masterMuted) return 0f
        return sourceVolume.coerceIn(0f, 1f) *
            linearToGain(masterVolume) *
            sleepFade.coerceIn(0f, 1f) *
            focusDuck.coerceIn(0f, 1f)
    }

    /** Master-only output scale (used for master fade / duck without source state). */
    fun masterGain(masterVolume: Float, masterMuted: Boolean): Float =
        if (masterMuted) 0f else linearToGain(masterVolume)
}

const val CURVE_EXPONENT = 2.0f
