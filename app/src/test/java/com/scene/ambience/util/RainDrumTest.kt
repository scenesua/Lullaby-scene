package com.scene.ambience.util

import com.scene.ambience.data.BuiltInPresets
import com.scene.ambience.data.model.SoundLibraryManifest
import java.io.File
import kotlinx.serialization.json.Json
import kotlin.math.abs
import kotlin.random.Random
import org.junit.Assert.*
import org.junit.Test

class RainDrumTest {
    @Test fun melodyAvoidsRepeatsAndFavorsNearbyNotes() {
        val random = Random(91)
        var previous = -1
        var near = 0
        val seen = mutableSetOf<Int>()
        repeat(5000) {
            val next = EventScheduler.nextWeightedIndex((0..4).map { EventScheduler.melodicWeight(it, previous) }, random)
            assertTrue(next in 0..4)
            assertNotEquals(previous, next)
            if (abs(next - previous) == 1) near++
            seen += next
            previous = next
        }
        assertEquals(5, seen.size)
        assertTrue(near > 2500)
        assertEquals(0f, EventScheduler.melodicWeight(2, 2), 0f)
    }

    @Test fun irregularTimingIncludesRestsWithinTailLength() {
        val random = Random(42)
        val delays = List(1000) { EventScheduler.rainDrumDelayMs(random) }
        assertTrue(delays.all { it in 900L..6400L })
        assertTrue(delays.any { it > 3800L })
        assertTrue(delays.distinct().size > 500)
    }

    @Test fun presetAndPackagedNotesAreComplete() {
        val preset = BuiltInPresets.createAll().single { it.id == "preset_rain_eaves" }
        assertEquals(setOf("rain", "rain_drum"), preset.mix.sources.keys)
        assertEquals(.45f, preset.mix.sources.getValue("rain").volume, .001f)
        assertEquals(.28f, preset.mix.sources.getValue("rain_drum").volume, .001f)
        val assets = File("src/main/assets")
        val manifest = Json { ignoreUnknownKeys = true }.decodeFromString<SoundLibraryManifest>(File(assets, "ambience/manifest/sound_library.json").readText())
        val drum = manifest.sources.single { it.id == "rain_drum" }
        assertTrue(drum.continuous.isEmpty())
        assertEquals(listOf("rain_drum_c3", "rain_drum_d3", "rain_drum_e3", "rain_drum_g3", "rain_drum_a3"), drum.events.map { it.assetId })
        drum.events.forEach {
            val bytes = File(assets, it.path).readBytes()
            assertTrue(bytes.size > 1000)
            val marker = "\u0001vorbis".toByteArray()
            val header = (0..bytes.size - 30).first { offset -> marker.indices.all { n -> bytes[offset + n] == marker[n] } }
            assertEquals(2, bytes[header + 11].toInt())
            val sampleRate = java.nio.ByteBuffer.wrap(bytes, header + 12, 4).order(java.nio.ByteOrder.LITTLE_ENDIAN).int
            assertEquals(32000, sampleRate)
            assertEquals(7400L, it.durationMs)
            // App samples are 32 kHz stereo PCM16: retain the full tail below 1 MB.
            assertTrue(it.durationMs * 32 * 2 * 2 < 1_000_000)
        }
        assertTrue(File(assets, "visuals/simple-scenes/rain-eaves.webp").exists())
    }
}
