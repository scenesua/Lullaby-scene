package com.scene.ambience.media

import kotlin.random.Random

/**
 * Shared sleep-safety rules for living-scene random events.
 *
 * Scene-specific timelines still decide WHAT can happen and WHEN fixed story beats
 * happen. This policy only classifies random events by arousal level and provides
 * conservative guard windows / spacing so attention-grabbing sounds do not cluster
 * around sleep onset or early sleep.
 */
enum class SleepEventArousal {
    SOOTHING,
    NEUTRAL,
    DISRUPTIVE,
}

object SleepEventPolicy {
    /** Keep disruptive random events out of the first 90 minutes after the scene becomes sleep-ready. */
    const val EARLY_SLEEP_DISRUPTIVE_GUARD_MS = 90L * 60_000L

    /** Give even neutral cabin-detail events a quieter settling window first. */
    const val NEUTRAL_SETTLING_GUARD_MS = 30L * 60_000L

    fun nextGapMs(arousal: SleepEventArousal, random: Random): Long = when (arousal) {
        SleepEventArousal.SOOTHING -> randomMinutes(random, 20, 50)
        SleepEventArousal.NEUTRAL -> randomMinutes(random, 60, 120)
        SleepEventArousal.DISRUPTIVE -> randomMinutes(random, 100, 180)
    }

    fun intensity(random: Random, arousal: SleepEventArousal): Float = when (arousal) {
        SleepEventArousal.SOOTHING -> random.nextDouble(0.10, 0.30).toFloat()
        SleepEventArousal.NEUTRAL -> random.nextDouble(0.10, 0.28).toFloat()
        SleepEventArousal.DISRUPTIVE -> random.nextDouble(0.12, 0.32).toFloat()
    }

    private fun randomMinutes(random: Random, min: Int, max: Int): Long =
        random.nextInt(min, max + 1) * 60_000L
}
