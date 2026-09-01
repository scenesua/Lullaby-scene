package com.scene.ambience.data.model

import com.scene.ambience.data.BuiltInPresets
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Validates the packaged manifests against the real generated files. */
class ManifestParsingTest {

    private val json = Json { ignoreUnknownKeys = true }

    private fun manifestFile(name: String): File {
        val candidates = listOf(
            File("src/main/assets/ambience/manifest/$name"),
            File("app/src/main/assets/ambience/manifest/$name"),
            File("../../app/src/main/assets/ambience/manifest/$name"),
        )
        return candidates.firstOrNull { it.exists() } ?: error("manifest $name not found")
    }

    @Test
    fun soundLibraryManifestIsValid() {
        val manifest = json.decodeFromString<SoundLibraryManifest>(manifestFile("sound_library.json").readText())
        assertTrue("version", manifest.version >= 1)
        assertTrue("at least 20 sources", manifest.sources.size >= 20)

        val ids = manifest.sources.map { it.id }
        assertEquals("unique ids", ids.size, ids.toSet().size)

        manifest.sources.forEach { source ->
            assertTrue("${source.id} loop mode", source.loopMode in setOf("seamless", "crossfade", "event", "unsupported"))
            if (source.loopMode == "unsupported") {
                assertTrue("${source.id} unsupported source is excluded", source.allFiles.isEmpty())
            } else {
                assertTrue("${source.id} must have files", source.allFiles.isNotEmpty())
            }
            if (source.loopMode == "seamless") {
                assertEquals("${source.id} seamless source has exactly one file", 1, source.continuous.size)
            }
            if (source.loopMode == "event") {
                assertTrue("${source.id} event source has no continuous files", source.continuous.isEmpty())
            }
            assertTrue("$source.id defaults sane", source.defaultVolume in 0.0..1.0)
            source.allFiles.forEach { asset ->
                assertTrue("${source.id} path", asset.path.startsWith("ambience/"))
                assertTrue("${source.id} ${asset.assetId} duration", asset.durationMs >= 0)
                if (source.loopMode == "crossfade" && asset in source.continuous) {
                    assertTrue("${source.id} ${asset.assetId} crossfade", asset.crossfadeMs > 0)
                }
            }
        }
        assertEquals(3.0, manifest.sources.first { it.id == "train" }.trimGainDb, 0.0)
        assertEquals(1.4125f, manifest.sources.first { it.id == "train" }.trimGain, 0.0002f)
        manifest.sources.filterNot { it.id == "train" }.forEach {
            assertEquals("${it.id} trim unchanged", 0.0, it.trimGainDb, 0.0)
        }
        listOf("white_noise", "pink_noise", "brown_noise").forEach { id ->
            val source = manifest.sources.first { it.id == id }
            assertEquals("$id seamless", "seamless", source.loopMode)
            assertEquals("$id one asset", 1, source.continuous.size)
        }
        listOf("crickets", "ocean", "singing_bowl", "thunder", "wind").forEach { id ->
            val source = manifest.sources.first { it.id == id }
            assertEquals("$id repaired seamless", "seamless", source.loopMode)
            assertEquals("$id uses one verified asset", 1, source.continuous.size)
            assertTrue("$id has no event assets", source.events.isEmpty())
        }
        val forest = manifest.sources.first { it.id == "forest" }
        assertEquals("forest crossfade", "crossfade", forest.loopMode)
        assertEquals("forest uses the verified long bed", 1, forest.continuous.size)
        assertEquals("forest long bed duration", 226_000L, forest.continuous.single().durationMs)
        assertEquals("forest long bed crossfade", 12_000L, forest.continuous.single().crossfadeMs)
        assertTrue("forest has no event assets", forest.events.isEmpty())

        val bambooForest = manifest.sources.first { it.id == "bamboo_forest" }
        assertEquals("bamboo forest crossfade", "crossfade", bambooForest.loopMode)
        assertEquals("bamboo forest has three analyzed assets", 3, bambooForest.continuous.size)
        assertTrue("bamboo forest has no event assets", bambooForest.events.isEmpty())
        assertTrue("miscellaneous removed", "miscellaneous" !in ids)
    }

    @Test
    fun categoryPresetsAreValid() {
        val presets = json.decodeFromString<CategoryPresetsFile>(manifestFile("category_presets.json").readText())
        assertTrue(presets.categories.isNotEmpty())
        presets.categories.forEach { (id, config) ->
            assertTrue("$id intervals", config.maxIntervalMs >= config.minIntervalMs)
            assertTrue("$id min interval", config.minIntervalMs >= 100)
            assertTrue("$id volume range", config.eventVolumeRange.size == 2)
        }
    }

    @Test
    fun licensesAreValid() {
        val licenses = json.decodeFromString<LicensesFile>(manifestFile("licenses.json").readText())
        assertTrue(licenses.entries.isNotEmpty())
        licenses.entries.forEach { entry ->
            assertTrue("asset id", entry.assetId.isNotBlank())
        }
    }

    @Test
    fun sourcesMatchCatalogIds() {
        val manifest = json.decodeFromString<SoundLibraryManifest>(manifestFile("sound_library.json").readText())
        val sceneManifest = json.decodeFromString<SoundLibraryManifest>(manifestFile("scene_sources.json").readText())
        val catalogIds = SourceId.entries.map { it.id }.toSet()
        (manifest.sources + sceneManifest.sources).forEach { source ->
            assertTrue(
                "unexpected source id ${source.id} (catalog: $catalogIds)",
                source.id in catalogIds,
            )
        }
    }

    @Test
    fun hoodIncidentHasDistantGunAndVoiceVariety() {
        val manifest = json.decodeFromString<SoundLibraryManifest>(manifestFile("scene_sources.json").readText())
        val guns = manifest.sources.first { it.id == "hood_gunshot" }.events
        val voices = manifest.sources.first { it.id == "hood_shout" }.events
        assertTrue("HOOD has at least five gun recordings", guns.size >= 5)
        assertTrue("HOOD has at least four shout or scream recordings", voices.size >= 4)
        (guns + voices).forEach { asset ->
            assertTrue("${asset.assetId} is authored as distant", "distant" in asset.tags)
        }
    }

    @Test
    fun everyBuiltInPresetReferencesExistingSourcesAndSaneVolumes() {
        val manifest = json.decodeFromString<SoundLibraryManifest>(manifestFile("sound_library.json").readText())
        val sceneManifest = json.decodeFromString<SoundLibraryManifest>(manifestFile("scene_sources.json").readText())
        val ids = (manifest.sources + sceneManifest.sources).map { it.id }.toSet()
        val presetIds = BuiltInPresets.createAll().map { it.id }
        assertEquals("unique preset ids", presetIds.size, presetIds.toSet().size)
        BuiltInPresets.createAll().forEach { preset ->
            preset.mix.sources.forEach { (id, state) ->
                assertTrue("$preset.id references $id which has assets", id in ids)
                assertTrue("$id volume", state.volume in 0f..1f)
                assertTrue("$id master", preset.mix.masterVolume in 0f..1f)
            }
        }
    }
}

class MixStateJsonTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun roundTripPreservesAllFields() {
        val mix = MixState(
            masterVolume = 0.65f,
            masterMuted = false,
            sources = mapOf(
                "rain" to SourceState(id = "rain", enabled = true, volume = 0.5f, muted = false),
                "fan" to SourceState(id = "fan", enabled = true, volume = 0.2f, muted = true),
                "white_noise" to SourceState(id = "white_noise", enabled = true, volume = 0.3f),
                "pink_noise" to SourceState(id = "pink_noise", enabled = true, volume = 0.25f),
                "brown_noise" to SourceState(id = "brown_noise", enabled = false, volume = 0f),
                "crickets" to SourceState(id = "crickets", enabled = true, volume = 0.4f),
                "thunder" to SourceState(id = "thunder", enabled = true, volume = 0.3f),
                "singing_bowl" to SourceState(id = "singing_bowl", enabled = true, volume = 0.25f),
                "forest" to SourceState(id = "forest", enabled = true, volume = 0.35f),
                "bamboo_forest" to SourceState(id = "bamboo_forest", enabled = true, volume = 0.3f),
            ),
        )
        val encoded = json.encodeToString(MixState.serializer(), mix)
        val decoded = json.decodeFromString<MixState>(encoded)
        assertEquals(mix, decoded)
    }

    @Test
    fun fromJsonRejectsGarbage() {
        assertNull(MixState.fromJson("not json at all"))
        assertNull(MixState.fromJson("""{"sources": 42}"""))
    }

    @Test
    fun fromJsonDefaultsMissingFields() {
        val mix = MixState.fromJson("""{"sources":{}}""")
        assertNotNull(mix)
        assertEquals(0.8f, mix!!.masterVolume, 0f)
        assertTrue(mix.sources.isEmpty())
    }

    @Test
    fun snapshotSerializes() {
        val snapshot = EngineSnapshot(
            playbackState = PlaybackState.PLAYING,
            masterVolume = 0.7f,
            sources = mapOf("rain" to SourceState(id = "rain", enabled = true, volume = 0.4f)),
            sleepTimerRemainingMs = 1500L,
        )
        val encoded = json.encodeToString(EngineSnapshot.serializer(), snapshot)
        val decoded = json.decodeFromString<EngineSnapshot>(encoded)
        assertEquals(snapshot, decoded)
    }
}
