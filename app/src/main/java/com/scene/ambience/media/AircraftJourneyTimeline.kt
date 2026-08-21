package com.scene.ambience.media

import kotlin.math.abs
import kotlin.random.Random

/**
 * Journey plan for Passenger Aircraft Cabin.
 *
 * User-entered duration is never clamped to the recommended buttons. For long
 * journeys the aircraft keeps realistic absolute departure/arrival windows and
 * cruise absorbs the remaining time. Very short user-entered journeys compress
 * the same phase order proportionally so every positive duration is valid.
 */
data class AircraftJourneyTimeline(
    val totalDurationMs: Long,
    val taxiOutEndMs: Long,
    val takeoffEndMs: Long,
    val climbEndMs: Long,
    val seatbeltOffMs: Long,
    val descentStartMs: Long,
    val seatbeltOnMs: Long,
    val approachStartMs: Long,
    val touchdownMs: Long,
    val journeyEndMs: Long,
    val events: List<AircraftJourneyEvent>,
) {
    fun phaseAt(elapsedMs: Long): String = when {
        elapsedMs < taxiOutEndMs -> SceneOrchestrator.STATE_TAXI_OUT
        elapsedMs < takeoffEndMs -> SceneOrchestrator.STATE_TAKEOFF
        elapsedMs < climbEndMs -> SceneOrchestrator.STATE_CLIMB
        elapsedMs < descentStartMs -> SceneOrchestrator.STATE_CRUISE
        elapsedMs < approachStartMs -> SceneOrchestrator.STATE_DESCENT
        elapsedMs < touchdownMs -> SceneOrchestrator.STATE_APPROACH
        elapsedMs < journeyEndMs -> SceneOrchestrator.STATE_TAXI_IN
        else -> SceneOrchestrator.STATE_ARRIVED
    }

    fun seatbeltSignOnAt(elapsedMs: Long): Boolean =
        elapsedMs < seatbeltOffMs || elapsedMs >= seatbeltOnMs

    fun activeEventsAt(elapsedMs: Long): List<AircraftJourneyEvent> =
        events.filter { elapsedMs in it.startMs until it.endMs }
}

data class AircraftJourneyEvent(
    val kind: String,
    val startMs: Long,
    val endMs: Long,
    val intensity: Float,
    val arousal: SleepEventArousal,
)

object AircraftJourneyTimelineBuilder {
    const val FREE_INPUT_MINUTES = 1
    const val SLIDER_MAX_MINUTES = 720
    val FIXED_DURATION_MINUTES = listOf(360, 480, 600)

    private const val COMPACT_TIMELINE_BELOW_MINUTES = 240
    private const val EVENT_CLUSTER_GUARD_MS = 15L * 60_000L
    private const val PRE_ARRIVAL_RANDOM_GUARD_MS = 20L * 60_000L

    fun normalizeDurationMinutes(minutes: Int): Int = minutes.coerceAtLeast(FREE_INPUT_MINUTES)

    fun build(totalDurationMinutes: Int, seed: Long): AircraftJourneyTimeline {
        val totalMinutes = normalizeDurationMinutes(totalDurationMinutes)
        val totalMs = totalMinutes * MINUTE_MS
        if (totalMinutes < COMPACT_TIMELINE_BELOW_MINUTES) return buildCompact(totalMs)

        val random = Random(seed)
        val taxiOutMs = randomMinutes(random, 8, 18)
        val takeoffRollMs = randomSeconds(random, 45, 75)
        val climbMs = randomMinutes(random, 10, 16)
        val taxiInMs = randomMinutes(random, 5, 12)
        val descentLeadMs = randomMinutes(random, 28, 38)
        val approachLeadMs = randomMinutes(random, 10, 15)

        val taxiOutEnd = taxiOutMs
        val takeoffEnd = taxiOutEnd + takeoffRollMs
        val climbEnd = takeoffEnd + climbMs
        val journeyEnd = totalMs
        val touchdown = journeyEnd - taxiInMs
        val approachStart = (touchdown - approachLeadMs).coerceAtLeast(climbEnd + 60 * MINUTE_MS)
        val descentStart = (touchdown - descentLeadMs).coerceAtLeast(climbEnd + 30 * MINUTE_MS)

        val seatbeltOff = (takeoffEnd + randomMinutes(random, 8, 18)).coerceAtLeast(climbEnd)
        val seatbeltOn = (touchdown - randomMinutes(random, 20, 30))
            .coerceIn(descentStart, approachStart)

        val events = buildCruiseEvents(
            random = random,
            sleepReadyMs = seatbeltOff,
            cruiseStartMs = maxOf(climbEnd, seatbeltOff) + 15 * MINUTE_MS,
            cruiseEndMs = descentStart - PRE_ARRIVAL_RANDOM_GUARD_MS,
        )

        return AircraftJourneyTimeline(
            totalDurationMs = totalMs,
            taxiOutEndMs = taxiOutEnd,
            takeoffEndMs = takeoffEnd,
            climbEndMs = climbEnd,
            seatbeltOffMs = seatbeltOff,
            descentStartMs = descentStart,
            seatbeltOnMs = seatbeltOn,
            approachStartMs = approachStart,
            touchdownMs = touchdown,
            journeyEndMs = journeyEnd,
            events = events,
        )
    }

    private fun buildCompact(totalMs: Long): AircraftJourneyTimeline {
        fun at(ratio: Double): Long = (totalMs * ratio).toLong().coerceIn(0L, totalMs)
        val taxiOutEnd = at(0.025)
        val takeoffEnd = at(0.0275).coerceAtLeast(taxiOutEnd + 1L).coerceAtMost(totalMs)
        val climbEnd = at(0.05625).coerceAtLeast(takeoffEnd).coerceAtMost(totalMs)
        val seatbeltOff = at(0.075).coerceAtLeast(climbEnd).coerceAtMost(totalMs)
        val descentStart = at(0.9125).coerceAtLeast(seatbeltOff).coerceAtMost(totalMs)
        val seatbeltOn = at(0.925).coerceIn(descentStart, totalMs)
        val approachStart = at(0.96875).coerceAtLeast(seatbeltOn).coerceAtMost(totalMs)
        val touchdown = at(0.9875).coerceAtLeast(approachStart).coerceAtMost(totalMs)
        return AircraftJourneyTimeline(
            totalDurationMs = totalMs,
            taxiOutEndMs = taxiOutEnd,
            takeoffEndMs = takeoffEnd,
            climbEndMs = climbEnd,
            seatbeltOffMs = seatbeltOff,
            descentStartMs = descentStart,
            seatbeltOnMs = seatbeltOn,
            approachStartMs = approachStart,
            touchdownMs = touchdown,
            journeyEndMs = totalMs,
            events = emptyList(),
        )
    }

    private fun buildCruiseEvents(
        random: Random,
        sleepReadyMs: Long,
        cruiseStartMs: Long,
        cruiseEndMs: Long,
    ): List<AircraftJourneyEvent> {
        if (cruiseEndMs <= cruiseStartMs) return emptyList()

        val disruptive = mutableListOf<AircraftJourneyEvent>()
        val disruptiveStart = maxOf(
            cruiseStartMs,
            sleepReadyMs + SleepEventPolicy.EARLY_SLEEP_DISRUPTIVE_GUARD_MS,
        )
        var disruptiveCursor = disruptiveStart + randomMinutes(random, 20, 60)
        while (disruptiveCursor < cruiseEndMs) {
            val duration = randomSeconds(random, 30, 90)
            val end = (disruptiveCursor + duration).coerceAtMost(cruiseEndMs)
            if (end > disruptiveCursor) {
                disruptive += AircraftJourneyEvent(
                    kind = EVENT_TURBULENCE,
                    startMs = disruptiveCursor,
                    endMs = end,
                    intensity = SleepEventPolicy.intensity(random, SleepEventArousal.DISRUPTIVE),
                    arousal = SleepEventArousal.DISRUPTIVE,
                )
            }
            disruptiveCursor += SleepEventPolicy.nextGapMs(SleepEventArousal.DISRUPTIVE, random)
        }

        val neutral = mutableListOf<AircraftJourneyEvent>()
        val neutralStart = maxOf(
            cruiseStartMs,
            sleepReadyMs + SleepEventPolicy.NEUTRAL_SETTLING_GUARD_MS,
        )
        var neutralCursor = neutralStart + randomMinutes(random, 15, 45)
        while (neutralCursor < cruiseEndMs) {
            val tooCloseToDisruptive = disruptive.any {
                abs(it.startMs - neutralCursor) < EVENT_CLUSTER_GUARD_MS
            }
            if (!tooCloseToDisruptive) {
                val duration = randomSeconds(random, 20, 60)
                val end = (neutralCursor + duration).coerceAtMost(cruiseEndMs)
                if (end > neutralCursor) {
                    neutral += AircraftJourneyEvent(
                        kind = EVENT_CABIN_ACTIVITY,
                        startMs = neutralCursor,
                        endMs = end,
                        intensity = SleepEventPolicy.intensity(random, SleepEventArousal.NEUTRAL),
                        arousal = SleepEventArousal.NEUTRAL,
                    )
                }
            }
            neutralCursor += SleepEventPolicy.nextGapMs(SleepEventArousal.NEUTRAL, random)
        }

        return (neutral + disruptive).sortedBy { it.startMs }
    }

    private fun randomMinutes(random: Random, min: Int, max: Int): Long =
        random.nextInt(min, max + 1) * MINUTE_MS

    private fun randomSeconds(random: Random, min: Int, max: Int): Long =
        random.nextInt(min, max + 1) * 1_000L

    const val EVENT_TURBULENCE = "turbulence_pulse"
    const val EVENT_CABIN_ACTIVITY = "cabin_activity"
    private const val MINUTE_MS = 60_000L
}
