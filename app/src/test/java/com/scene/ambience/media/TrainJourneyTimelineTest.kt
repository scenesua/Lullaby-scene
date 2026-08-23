package com.scene.ambience.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainJourneyTimelineTest {
    @Test
    fun fullJourneyKeepsTransitionsAndLetsNightRunAbsorbDuration() {
        val plan = TrainJourneyTimelineBuilder.build(480)
        assertEquals(SceneOrchestrator.STATE_TRAIN_DEPARTURE, plan.phaseAt(0))
        assertEquals(SceneOrchestrator.STATE_TRAIN_LEAVING_CITY, plan.phaseAt(plan.departureEndMs))
        assertEquals(SceneOrchestrator.STATE_TRAIN_NIGHT_RUN, plan.phaseAt(plan.leavingCityEndMs))
        assertEquals(SceneOrchestrator.STATE_TRAIN_APPROACH, plan.phaseAt(plan.approachStartMs))
        assertEquals(SceneOrchestrator.STATE_TRAIN_ARRIVAL, plan.phaseAt(plan.arrivalStartMs))
        assertEquals(SceneOrchestrator.STATE_ARRIVED, plan.phaseAt(plan.journeyEndMs))
        assertTrue(plan.approachStartMs > plan.leavingCityEndMs)
    }

    @Test
    fun shortJourneyPreservesOrderedPhases() {
        val plan = TrainJourneyTimelineBuilder.build(1)
        assertTrue(plan.departureEndMs < plan.leavingCityEndMs)
        assertTrue(plan.leavingCityEndMs < plan.approachStartMs)
        assertTrue(plan.approachStartMs < plan.arrivalStartMs)
        assertTrue(plan.arrivalStartMs < plan.journeyEndMs)
    }
}
