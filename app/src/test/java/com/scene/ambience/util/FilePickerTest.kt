package com.scene.ambience.util

import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FilePickerTest {

    @Test
    fun neverRepeatsConsecutively() {
        val picker = FilePicker(Random(3))
        var last = -1
        repeat(300) {
            val idx = picker.nextIndex(3)
            assertTrue("must avoid $last", idx != last)
            last = idx
        }
    }

    @Test
    fun startOffsetLeavesReserve() {
        val picker = FilePicker(Random(5))
        repeat(300) {
            val offset = picker.startOffsetMs(60_000L, 8_000L, Random(1))
            assertTrue("offset $offset", offset in 0L..52_000L)
        }
    }

    @Test
    fun startOffsetZeroWhenDurationTiny() {
        val picker = FilePicker()
        assertEquals(0L, picker.startOffsetMs(1_000L, 8_000L))
        assertEquals(0L, picker.startOffsetMs(0L, 0L))
    }

    @Test
    fun resetClearsLastIndex() {
        val picker = FilePicker(Random(2))
        picker.nextIndex(2)
        picker.reset()
        assertTrue(picker.nextIndex(2) in 0..1)
    }
}
