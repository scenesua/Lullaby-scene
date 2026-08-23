package com.scene.ambience.media

/** Deterministic overnight rail arc shared by seek, restore and phase stepping. */
data class TrainJourneyTimeline(
    val totalDurationMs: Long,
    val departureEndMs: Long,
    val leavingCityEndMs: Long,
    val approachStartMs: Long,
    val arrivalStartMs: Long,
    val journeyEndMs: Long,
) {
    fun phaseAt(elapsedMs: Long): String = when {
        elapsedMs < departureEndMs -> SceneOrchestrator.STATE_TRAIN_DEPARTURE
        elapsedMs < leavingCityEndMs -> SceneOrchestrator.STATE_TRAIN_LEAVING_CITY
        elapsedMs < approachStartMs -> SceneOrchestrator.STATE_TRAIN_NIGHT_RUN
        elapsedMs < arrivalStartMs -> SceneOrchestrator.STATE_TRAIN_APPROACH
        elapsedMs < journeyEndMs -> SceneOrchestrator.STATE_TRAIN_ARRIVAL
        else -> SceneOrchestrator.STATE_ARRIVED
    }

    fun activeEventAt(elapsedMs: Long): String? = when (phaseAt(elapsedMs)) {
        SceneOrchestrator.STATE_TRAIN_DEPARTURE -> EVENT_DEPARTURE
        SceneOrchestrator.STATE_TRAIN_ARRIVAL -> EVENT_ARRIVAL
        else -> null
    }

    companion object {
        const val EVENT_DEPARTURE = "train_departure"
        const val EVENT_ARRIVAL = "train_arrival"
    }
}

object TrainJourneyTimelineBuilder {
    private const val MINUTE_MS = 60_000L
    private const val DEPARTURE_MS = 35_183L
    private const val ARRIVAL_MS = 32_236L
    private const val FULL_ARC_MINUTES = 20

    fun build(totalDurationMinutes: Int): TrainJourneyTimeline {
        val minutes = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(totalDurationMinutes)
        val total = minutes * MINUTE_MS
        if (minutes < FULL_ARC_MINUTES) {
            fun at(ratio: Double): Long = (total * ratio).toLong().coerceIn(0L, total)
            return TrainJourneyTimeline(
                totalDurationMs = total,
                departureEndMs = at(0.06),
                leavingCityEndMs = at(0.18),
                approachStartMs = at(0.82),
                arrivalStartMs = at(0.94),
                journeyEndMs = total,
            )
        }
        return TrainJourneyTimeline(
            totalDurationMs = total,
            departureEndMs = DEPARTURE_MS,
            leavingCityEndMs = 8 * MINUTE_MS,
            approachStartMs = total - 8 * MINUTE_MS,
            arrivalStartMs = total - ARRIVAL_MS,
            journeyEndMs = total,
        )
    }
}
