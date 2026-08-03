package com.scene.ambience.data

import android.content.Context
import com.scene.ambience.data.model.CategoryPresetsFile
import com.scene.ambience.data.model.LicensesFile
import com.scene.ambience.data.model.SoundLibraryManifest
import com.scene.ambience.data.model.SoundLibraryState
import com.scene.ambience.data.model.SourceManifest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json

/**
 * Loads the packaged manifests once. The app never scans folders at runtime;
 * it reads sound_library.json exactly as the prep tool generated it.
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
        val manifestJson = readAsset("ambience/manifest/sound_library.json") ?: return SoundLibraryState(loadError = "manifest_missing")
        return try {
            val manifest = json.decodeFromString<SoundLibraryManifest>(manifestJson)
            val presets = readAsset("ambience/manifest/category_presets.json")?.let {
                runCatching { json.decodeFromString<CategoryPresetsFile>(it) }.getOrNull()
            }
            val licenses = readAsset("ambience/manifest/licenses.json")?.let {
                runCatching { json.decodeFromString<LicensesFile>(it) }.getOrNull()
            }
            SoundLibraryState(
                version = manifest.version,
                sources = manifest.sources.filter { it.allFiles.isNotEmpty() },
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
