package com.scene.ambience.data

import android.content.Context
import com.scene.ambience.data.model.AssetOverridesFile
import com.scene.ambience.data.model.CategoryPresetsFile
import com.scene.ambience.data.model.ContinuousExtensionsFile
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
 * Loads the packaged manifests once. The canonical v1.0.3 manifest stays
 * generated and immutable; additive packs and reviewed overrides are merged at
 * load time so legacy files can be preserved, disabled or repurposed without
 * hand-editing the original source catalog.
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
            val continuousExtensions = decodeOptional<ContinuousExtensionsFile>(
                "ambience/manifest/continuous_extensions.json"
            )
            val eventExtensions = decodeOptional<EventExtensionsFile>(
                "ambience/manifest/event_extensions.json"
            )
            val overrides = decodeOptional<AssetOverridesFile>(
                "ambience/manifest/asset_overrides.json"
            )
            val presets = decodeOptional<CategoryPresetsFile>(
                "ambience/manifest/category_presets.json"
            )
            val legacyLicenses = decodeOptional<LicensesFile>(
                "ambience/manifest/licenses.json"
            )
            val externalLicenses = decodeOptional<LicensesFile>(
                "ambience/manifest/external_licenses.json"
            )

            val mergedSources = manifest.sources.map { source ->
                mergeSource(
                    source = source,
                    continuousAdditions = continuousExtensions?.sources?.get(source.id).orEmpty(),
                    eventAdditions = eventExtensions?.sources?.get(source.id).orEmpty(),
                    override = overrides?.sources?.get(source.id),
                )
            }

            SoundLibraryState(
                version = manifest.version,
                sources = mergedSources.filter { it.allFiles.isNotEmpty() },
                categoryPresets = presets?.categories ?: emptyMap(),
                licenses = (legacyLicenses?.entries.orEmpty() + externalLicenses?.entries.orEmpty())
                    .distinctBy { it.assetId },
                loadError = null,
            )
        } catch (e: Exception) {
            SoundLibraryState(loadError = "manifest_corrupt: ${e.message}")
        }
    }

    private fun mergeSource(
        source: SourceManifest,
        continuousAdditions: List<com.scene.ambience.data.model.AudioAssetManifest>,
        eventAdditions: List<com.scene.ambience.data.model.AudioAssetManifest>,
        override: com.scene.ambience.data.model.SourceAssetOverride?,
    ): SourceManifest {
        val disabled = override?.disabledAssetIds.orEmpty().toSet()
        return source.copy(
            defaultVolume = override?.defaultVolume ?: source.defaultVolume,
            trimGainDb = override?.trimGainDb ?: source.trimGainDb,
            loopMode = override?.loopMode ?: source.loopMode,
            continuous = (source.continuous + continuousAdditions)
                .distinctBy { it.assetId }
                .filterNot { it.assetId in disabled },
            events = (source.events + eventAdditions)
                .distinctBy { it.assetId }
                .filterNot { it.assetId in disabled },
        )
    }

    private inline fun <reified T> decodeOptional(path: String): T? =
        readAsset(path)?.let { runCatching { json.decodeFromString<T>(it) }.getOrNull() }

    /** Manifest source for a source id, or null when the source has no packaged files. */
    fun manifestFor(sourceId: String): SourceManifest? =
        _state.value.sources.firstOrNull { it.id == sourceId }

    private fun readAsset(path: String): String? = try {
        appContext.assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }
    } catch (e: Exception) {
        null
    }
}
