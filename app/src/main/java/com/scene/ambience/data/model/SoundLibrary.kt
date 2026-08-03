package com.scene.ambience.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.math.pow

/** Mirror of app/src/main/assets/ambience/manifest/sound_library.json */
@Serializable
data class SoundLibraryManifest(
    val version: Int = 1,
    val sources: List<SourceManifest> = emptyList(),
)

@Serializable
data class SourceManifest(
    val id: String,
    val category: String = "other",
    @SerialName("display_name_key") val displayNameKey: String = "source_$id",
    @SerialName("default_volume") val defaultVolume: Double = 0.3,
    @SerialName("trim_gain_db") val trimGainDb: Double = 0.0,
    @SerialName("loop_mode") val loopMode: String = "crossfade",
    val continuous: List<AudioAssetManifest> = emptyList(),
    val events: List<AudioAssetManifest> = emptyList(),
) {
    val trimGain: Float get() = 10.0.pow(trimGainDb / 20.0).toFloat()
    val allFiles: List<AudioAssetManifest>
        get() = continuous + events
}

@Serializable
data class AudioAssetManifest(
    @SerialName("asset_id") val assetId: String,
    val path: String,
    @SerialName("duration_ms") val durationMs: Long = 0L,
    @SerialName("crossfade_ms") val crossfadeMs: Long = 0L,
)

/** Mirror of app/src/main/assets/ambience/manifest/category_presets.json */
@Serializable
data class CategoryPresetsFile(
    val version: Int = 1,
    val categories: Map<String, CategoryPresetConfig> = emptyMap(),
)

@Serializable
data class CategoryPresetConfig(
    @SerialName("min_interval_seconds") val minIntervalSeconds: Double = 10.0,
    @SerialName("max_interval_seconds") val maxIntervalSeconds: Double = 60.0,
    val density: String = "medium",
    @SerialName("event_volume_range") val eventVolumeRange: List<Double> = listOf(0.75, 1.0),
    @SerialName("event_pan_range") val eventPanRange: List<Double> = listOf(-0.6, 0.6),
) {
    val minIntervalMs: Long get() = (minIntervalSeconds * 1000).toLong()
    val maxIntervalMs: Long get() = (maxIntervalSeconds * 1000).toLong()
}

/** Mirror of app/src/main/assets/ambience/manifest/licenses.json */
@Serializable
data class LicensesFile(
    val version: Int = 1,
    val entries: List<LicenseEntry> = emptyList(),
)

@Serializable
data class LicenseEntry(
    @SerialName("asset_id") val assetId: String,
    @SerialName("source_name") val sourceName: String? = null,
    val creator: String? = null,
    @SerialName("source_page") val sourcePage: String? = null,
    val license: String? = null,
    @SerialName("license_status") val licenseStatus: String = "unknown",
    @SerialName("attribution_required") val attributionRequired: Boolean = false,
    @SerialName("original_filename") val originalFilename: String = "",
    @SerialName("original_archive") val originalArchive: String? = null,
)

/** Overall result of loading the packaged sound library. */
data class SoundLibraryState(
    val version: Int = 1,
    val sources: List<SourceManifest> = emptyList(),
    val categoryPresets: Map<String, CategoryPresetConfig> = emptyMap(),
    val licenses: List<LicenseEntry> = emptyList(),
    val loadError: String? = null,
) {
    val hasAssets: Boolean get() = sources.isNotEmpty()

    fun manifestFor(sourceId: String): SourceManifest? =
        sources.firstOrNull { it.id == sourceId }
}
