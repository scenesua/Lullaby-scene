package com.scene.ambience.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AircraftJourneyTimelineTest {

    @Test
    fun `longer sleep stretches cruise without stretching departure`() {
        val seed = 42L
        val eightHours = AircraftJourneyTimelineBuilder.build(480, seed)
        val tenHours = AircraftJourneyTimelineBuilder.build(600, seed)

        assertEquals(eightHours.taxiOutEndMs, tenHours.taxiOutEndMs)
        assertEquals(eightHours.takeoffEndMs, tenHours.takeoffEndMs)
        assertEquals(eightHours.climbEndMs, tenHours.climbEndMs)
        assertEquals(120L * 60_000L, tenHours.journeyEndMs - eightHours.journeyEndMs)
        assertEquals(120L * 60_000L, tenHours.touchdownMs - eightHours.touchdownMs)
        assertEquals(120L * 60_000L, tenHours.descentStartMs - eightHours.descentStartMs)
    }

    @Test
    fun `seatbelt and arrival phases remain ordered`() {
        val plan = AircraftJourneyTimelineBuilder.build(480, 7L)

        assertTrue(plan.takeoffEndMs < plan.seatbeltOffMs)
        assertTrue(plan.seatbeltOffMs < plan.descentStartMs)
        assertTrue(plan.descentStartMs <= plan.seatbeltOnMs)
        assertTrue(plan.seatbeltOnMs <= plan.approachStartMs)
        assertTrue(plan.approachStartMs < plan.touchdownMs)
        assertTrue(plan.touchdownMs < plan.journeyEndMs)
    }

    @Test
    fun `random cruise events stay inside cruise safe window`() {
        val plan = AircraftJourneyTimelineBuilder.build(600, 99L)

        plan.events.forEach { event ->
            assertTrue(event.startMs > plan.climbEndMs)
            assertTrue(event.endMs < plan.descentStartMs)
            assertTrue(event.endMs > event.startMs)
        }
    }

    @Test
    fun `disruptive random events avoid sleep onset and stay sparse`() {
        val plan = AircraftJourneyTimelineBuilder.build(600, 99L)
        val disruptive = plan.events.filter { it.arousal == SleepEventArousal.DISRUPTIVE }
        val guardEnd = plan.seatbeltOffMs + SleepEventPolicy.EARLY_SLEEP_DISRUPTIVE_GUARD_MS

        disruptive.forEach { event ->
            assertTrue(event.startMs >= guardEnd)
            assertTrue(event.intensity <= 0.32f)
        }
        disruptive.zipWithNext().forEach { (first, second) ->
            assertTrue(second.startMs - first.startMs >= 100L * 60_000L)
        }
    }

    @Test
    fun `neutral events receive a settling guard and do not cluster around disruptive events`() {
        val plan = AircraftJourneyTimelineBuilder.build(600, 123L)
        val neutral = plan.events.filter { it.arousal == SleepEventArousal.NEUTRAL }
        val disruptive = plan.events.filter { it.arousal == SleepEventArousal.DISRUPTIVE }
        val guardEnd = plan.seatbeltOffMs + SleepEventPolicy.NEUTRAL_SETTLING_GUARD_MS

        neutral.forEach { event ->
            assertTrue(event.startMs >= guardEnd)
            disruptive.forEach { loud ->
                assertTrue(kotlin.math.abs(loud.startMs - event.startMs) >= 15L * 60_000L)
            }
        }
    }

    @Test
    fun `duration is bounded and quantized to thirty minutes`() {
        assertEquals(240, AircraftJourneyTimelineBuilder.normalizeDurationMinutes(60))
        assertEquals(480, AircraftJourneyTimelineBuilder.normalizeDurationMinutes(475))
        assertEquals(510, AircraftJourneyTimelineBuilder.normalizeDurationMinutes(500))
        assertEquals(720, AircraftJourneyTimelineBuilder.normalizeDurationMinutes(1000))
    }
}
