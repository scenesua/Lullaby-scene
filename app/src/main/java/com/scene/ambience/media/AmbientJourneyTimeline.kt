package com.scene.ambience.media

/** Five-stage deterministic arc used by non-aircraft ambient journeys. */
data class AmbientJourneyTimeline(
    val totalDurationMs: Long,
    val departureEndMs: Long,
    val settleEndMs: Long,
    val approachStartMs: Long,
    val arrivalStartMs: Long,
    val phases: List<String>,
) {
    val journeyEndMs: Long get() = totalDurationMs

    fun phaseAt(elapsedMs: Long): String = when {
        elapsedMs < departureEndMs -> phases[0]
        elapsedMs < settleEndMs -> phases[1]
        elapsedMs < approachStartMs -> phases[2]
        elapsedMs < arrivalStartMs -> phases[3]
        elapsedMs < totalDurationMs -> phases[4]
        else -> SceneOrchestrator.STATE_ARRIVED
    }

    fun phaseSteps(): List<Pair<String, Long>> = listOf(
        phases[0] to 0L,
        phases[1] to departureEndMs,
        phases[2] to settleEndMs,
        phases[3] to approachStartMs,
        phases[4] to arrivalStartMs,
        SceneOrchestrator.STATE_ARRIVED to totalDurationMs,
    )
}

object AmbientJourneyTimelineBuilder {
    private const val MINUTE_MS = 60_000L

    fun build(
        totalDurationMinutes: Int,
        departureMs: Long,
        arrivalMs: Long,
        phases: List<String>,
        settleMinutes: Int = 10,
        approachMinutes: Int = 10,
    ): AmbientJourneyTimeline {
        require(phases.size == 5)
        val total = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(totalDurationMinutes) * MINUTE_MS
        if (total < 20 * MINUTE_MS) {
            fun at(ratio: Double) = (total * ratio).toLong().coerceIn(0L, total)
            return AmbientJourneyTimeline(total, at(.06), at(.18), at(.82), at(.94), phases)
        }
        return AmbientJourneyTimeline(
            totalDurationMs = total,
            departureEndMs = departureMs.coerceAtMost(total / 6),
            settleEndMs = (settleMinutes * MINUTE_MS).coerceAtMost(total / 3),
            approachStartMs = (total - approachMinutes * MINUTE_MS).coerceAtLeast(total * 2 / 3),
            arrivalStartMs = (total - arrivalMs).coerceAtLeast(total * 5 / 6),
            phases = phases,
        )
    }
}
