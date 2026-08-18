package com.scene.ambience.data

import android.content.Context
import android.util.Log
import com.scene.ambience.data.model.AssetOverridesFile
import com.scene.ambience.data.model.AudioAssetManifest
import com.scene.ambience.data.model.CategoryPresetsFile
import com.scene.ambience.data.model.ContinuousExtensionsFile
import com.scene.ambience.data.model.EventExtensionsFile
import com.scene.ambience.data.model.LicensesFile
import com.scene.ambience.data.model.SoundLibraryManifest
import com.scene.ambience.data.model.SoundLibraryState
import com.scene.ambience.data.model.SourceAssetOverride
import com.scene.ambience.data.model.SourceManifest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json

/**
 * Loads packaged manifests once. The v1.0.3 catalog stays intact while optional
 * additive files can provide new scene sources, extra variants and reviewed
 * runtime overrides.
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
            val sceneSources = decodeOptional<SoundLibraryManifest>(
                "ambience/manifest/scene_sources.json"
            )
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

            val canonicalIds = manifest.sources.mapTo(mutableSetOf()) { it.id }
            val additive = sceneSources?.sources.orEmpty().filterNot { it.id in canonicalIds }
            val allSources = manifest.sources + additive
            val mergedSources = allSources.map { source ->
                mergeSource(
                    source = source,
                    continuousAdditions = continuousExtensions?.sources?.get(source.id).orEmpty(),
                    eventAdditions = eventExtensions?.sources?.get(source.id).orEmpty(),
                    override = overrides?.sources?.get(source.id),
                )
            }

            SoundLibraryState(
                version = maxOf(manifest.version, sceneSources?.version ?: 1),
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
        continuousAdditions: List<AudioAssetManifest>,
        eventAdditions: List<AudioAssetManifest>,
        override: SourceAssetOverride?,
    ): SourceManifest {
        val disabled = override?.disabledAssetIds.orEmpty().toSet()
        return source.copy(
            defaultVolume = override?.defaultVolume ?: source.defaultVolume,
            trimGainDb = override?.trimGainDb ?: source.trimGainDb,
            loopMode = override?.loopMode ?: source.loopMode,
            continuous = filterPackagedAssets(
                (source.continuous + continuousAdditions)
                    .distinctBy { it.assetId }
                    .filterNot { it.assetId in disabled }
            ),
            events = filterPackagedAssets(
                (source.events + eventAdditions)
                    .distinctBy { it.assetId }
                    .filterNot { it.assetId in disabled }
            ),
        )
    }

    private fun filterPackagedAssets(files: List<AudioAssetManifest>): List<AudioAssetManifest> =
        files.filter { asset ->
            val exists = assetExists(asset.path)
            if (!exists) {
                Log.i(TAG, "Skipping audio asset not packaged in this build: ${asset.assetId} (${asset.path})")
            }
            exists
        }

    private fun assetExists(path: String): Boolean = try {
        appContext.assets.open(path).use { }
        true
    } catch (_: Exception) {
        false
    }

    private inline fun <reified T> decodeOptional(path: String): T? =
        readAsset(path)?.let { runCatching { json.decodeFromString<T>(it) }.getOrNull() }

    fun manifestFor(sourceId: String): SourceManifest? =
        _state.value.sources.firstOrNull { it.id == sourceId }

    private fun readAsset(path: String): String? = try {
        appContext.assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }
    } catch (_: Exception) {
        null
    }

    companion object {
        private const val TAG = "SoundLibrary"
    }
}
