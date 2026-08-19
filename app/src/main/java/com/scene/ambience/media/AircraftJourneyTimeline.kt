package com.scene.ambience.media

import kotlin.random.Random

/**
 * Absolute-time journey plan for Passenger Aircraft Cabin.
 *
 * The user's selected duration is the whole simulated journey/sleep window.
 * Ground/takeoff/climb/descent/approach/taxi phases use bounded real-world-like
 * durations; only the long cruise section stretches to fill the requested total.
 * Random events are generated only inside cruise and never by percentage of the
 * whole journey.
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
)

object AircraftJourneyTimelineBuilder {
    const val MIN_DURATION_MINUTES = 240
    const val MAX_DURATION_MINUTES = 720
    const val STEP_MINUTES = 30

    fun normalizeDurationMinutes(minutes: Int): Int {
        val clamped = minutes.coerceIn(MIN_DURATION_MINUTES, MAX_DURATION_MINUTES)
        return ((clamped + STEP_MINUTES / 2) / STEP_MINUTES) * STEP_MINUTES
    }

    fun build(totalDurationMinutes: Int, seed: Long): AircraftJourneyTimeline {
        val totalMinutes = normalizeDurationMinutes(totalDurationMinutes)
        val totalMs = totalMinutes * MINUTE_MS
        val random = Random(seed)

        // Absolute phase lengths. They intentionally do not scale with an 8 h vs 10 h sleep.
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

        // The sign is always on for taxi/takeoff/climb. There is no universal legal
        // "X minutes after takeoff" switch-off time, so use a plausible operational window.
        val seatbeltOff = (takeoffEnd + randomMinutes(random, 8, 18)).coerceAtLeast(climbEnd)
        val seatbeltOn = (touchdown - randomMinutes(random, 20, 30))
            .coerceIn(descentStart, approachStart)

        val events = buildCruiseEvents(
            random = random,
            cruiseStartMs = maxOf(climbEnd, seatbeltOff) + 15 * MINUTE_MS,
            cruiseEndMs = descentStart - 10 * MINUTE_MS,
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

    private fun buildCruiseEvents(
        random: Random,
        cruiseStartMs: Long,
        cruiseEndMs: Long,
    ): List<AircraftJourneyEvent> {
        if (cruiseEndMs <= cruiseStartMs) return emptyList()
        val events = mutableListOf<AircraftJourneyEvent>()
        var cursor = cruiseStartMs + randomMinutes(random, 20, 50)
        var index = 0
        while (cursor < cruiseEndMs) {
            val kind = if (index % 3 == 2) EVENT_CABIN_ACTIVITY else EVENT_TURBULENCE
            val duration = if (kind == EVENT_TURBULENCE) {
                randomSeconds(random, 45, 150)
            } else {
                randomSeconds(random, 25, 90)
            }
            val end = (cursor + duration).coerceAtMost(cruiseEndMs)
            if (end > cursor) {
                events += AircraftJourneyEvent(
                    kind = kind,
                    startMs = cursor,
                    endMs = end,
                    intensity = random.nextDouble(0.18, 0.58).toFloat(),
                )
            }
            cursor += randomMinutes(random, 35, 90)
            index++
        }
        return events
    }

    private fun randomMinutes(random: Random, min: Int, max: Int): Long =
        random.nextInt(min, max + 1) * MINUTE_MS

    private fun randomSeconds(random: Random, min: Int, max: Int): Long =
        random.nextInt(min, max + 1) * 1_000L

    const val EVENT_TURBULENCE = "turbulence_pulse"
    const val EVENT_CABIN_ACTIVITY = "cabin_activity"
    private const val MINUTE_MS = 60_000L
}
