package com.scene.ambience.data

import android.content.Context
import com.scene.ambience.data.model.CategoryPresetsFile
import com.scene.ambience.data.model.EventExtensionsFile
import com.scene.ambience.data.model.LicensesFile
import com.scene.ambience.data.model.SoundLibraryManifest
import com.scene.ambience.data.model.SoundLibraryState
import com.scene.ambience.data.model.SourceManifest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json

/**
 * Loads the packaged manifests once. The canonical library remains generated
 * from sound_library.json, while optional additive event packs can extend a
 * source without mutating that generated file by hand.
 */
class SoundLibraryRepository(context: Context) {

    private val appContext = context.applicationContext
    private val json = Json { ignoreUnknownKeys = true }

    private val _state = MutableStateFlow(SoundLibraryState(loadError = "loading"))
    val state: StateFlow<SoundLibraryState> = _state.asStateFlow()

    suspend fun load() {
        if (_state.value.sources.isNotEmpty() || _state.value.loadError == "loading") {
            _state.value = readAll()
        }
    }

    fun loadNow() {
        _state.value = readAll()
    }

    /** Synchronous accessor for the service; re-reads if not loaded yet. */
    fun requireLibrary(): SoundLibraryState {
        if (_state.value.sources.isEmpty() && _state.value.loadError != null) loadNow()
        return _state.value
    }

    private fun readAll(): SoundLibraryState {
        val manifestJson = readAsset("ambience/manifest/sound_library.json")
            ?: return SoundLibraryState(loadError = "manifest_missing")
        return try {
            val manifest = json.decodeFromString<SoundLibraryManifest>(manifestJson)
            val eventExtensions = readAsset("ambience/manifest/event_extensions.json")?.let {
                runCatching { json.decodeFromString<EventExtensionsFile>(it) }.getOrNull()
            }
            val presets = readAsset("ambience/manifest/category_presets.json")?.let {
                runCatching { json.decodeFromString<CategoryPresetsFile>(it) }.getOrNull()
            }
            val licenses = readAsset("ambience/manifest/licenses.json")?.let {
                runCatching { json.decodeFromString<LicensesFile>(it) }.getOrNull()
            }

            val mergedSources = manifest.sources.map { source ->
                val additions = eventExtensions?.sources?.get(source.id).orEmpty()
                if (additions.isEmpty()) {
                    source
                } else {
                    source.copy(
                        events = (source.events + additions).distinctBy { it.assetId }
                    )
                }
            }

            SoundLibraryState(
                version = manifest.version,
                sources = mergedSources.filter { it.allFiles.isNotEmpty() },
                categoryPresets = presets?.categories ?: emptyMap(),
                licenses = licenses?.entries ?: emptyList(),
                loadError = null,
            )
        } catch (e: Exception) {
            SoundLibraryState(loadError = "manifest_corrupt: ${e.message}")
        }
    }

    /** Manifest source for a source id, or null when the source has no packaged files. */
    fun manifestFor(sourceId: String): SourceManifest? =
        _state.value.sources.firstOrNull { it.id == sourceId }

    private fun readAsset(path: String): String? = try {
        appContext.assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }
    } catch (e: Exception) {
        null
    }
}
