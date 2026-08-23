package com.scene.ambience.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AmbientJourneyTimelineTest {
    @Test
    fun fullJourneyKeepsAllFiveOrderedStages() {
        val phases = listOf("depart", "settle", "cruise", "approach", "arrival")
        val plan = AmbientJourneyTimelineBuilder.build(480, 98_000, 54_000, phases)
        assertEquals("depart", plan.phaseAt(0))
        assertEquals("settle", plan.phaseAt(plan.departureEndMs))
        assertEquals("cruise", plan.phaseAt(plan.settleEndMs))
        assertEquals("approach", plan.phaseAt(plan.approachStartMs))
        assertEquals("arrival", plan.phaseAt(plan.arrivalStartMs))
        assertEquals(SceneOrchestrator.STATE_ARRIVED, plan.phaseAt(plan.journeyEndMs))
        assertTrue(plan.phaseSteps().zipWithNext().all { (a, b) -> a.second < b.second })
    }
}
