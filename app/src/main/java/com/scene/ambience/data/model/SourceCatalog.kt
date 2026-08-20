package com.scene.ambience.data.model

import androidx.annotation.StringRes
import com.scene.ambience.R

/**
 * The canonical catalog of user-visible sound sources. The packaged
 * sound_library.json decides which of these actually have playable files;
 * sources without assets are shown as disabled with an explanatory message.
 */
enum class SourceId(val id: String) {
    RAIN("rain"),
    THUNDER("thunder"),
    WIND("wind"),
    OCEAN("ocean"),
    STREAM("stream"),
    FIRE("fire"),
    FOREST("forest"),
    BIRDS("birds"),
    CRICKETS("crickets"),
    CAFE("cafe"),
    CITY("city"),
    TRAIN("train"),
    FAN("fan"),
    VENTILATION("ventilation"),
    WATER("water"),
    SINGING_BOWL("singing_bowl"),
    BAMBOO_FOREST("bamboo_forest"),
    WHITE_NOISE("white_noise"),
    PINK_NOISE("pink_noise"),
    BROWN_NOISE("brown_noise");

    companion object {
        private val byId: Map<String, SourceId> = entries.associateBy(SourceId::id)

        fun fromId(id: String): SourceId? = byId[id]
    }
}

enum class UiCategory(val id: String) {
    NATURE("nature"),
    INDOOR("indoor"),
    TRAVEL("travel"),
    OTHER("other")
}

data class SourceDefinition(
    val sourceId: SourceId,
    @StringRes val displayNameRes: Int,
    val uiCategory: UiCategory,
)

object SourceCatalog {
    val all: List<SourceDefinition> = listOf(
        SourceDefinition(SourceId.RAIN, R.string.source_rain, UiCategory.NATURE),
        SourceDefinition(SourceId.THUNDER, R.string.source_thunder, UiCategory.NATURE),
        SourceDefinition(SourceId.WIND, R.string.source_wind, UiCategory.NATURE),
        SourceDefinition(SourceId.OCEAN, R.string.source_ocean, UiCategory.NATURE),
        SourceDefinition(SourceId.STREAM, R.string.source_stream, UiCategory.NATURE),
        SourceDefinition(SourceId.FOREST, R.string.source_forest, UiCategory.NATURE),
        SourceDefinition(SourceId.BAMBOO_FOREST, R.string.source_bamboo_forest, UiCategory.NATURE),
        SourceDefinition(SourceId.BIRDS, R.string.source_birds, UiCategory.NATURE),
        SourceDefinition(SourceId.CRICKETS, R.string.source_crickets, UiCategory.NATURE),
        SourceDefinition(SourceId.FIRE, R.string.source_fire, UiCategory.INDOOR),
        SourceDefinition(SourceId.CAFE, R.string.source_cafe, UiCategory.INDOOR),
        SourceDefinition(SourceId.FAN, R.string.source_fan, UiCategory.INDOOR),
        SourceDefinition(SourceId.VENTILATION, R.string.source_ventilation, UiCategory.INDOOR),
        SourceDefinition(SourceId.CITY, R.string.source_city, UiCategory.TRAVEL),
        SourceDefinition(SourceId.TRAIN, R.string.source_train, UiCategory.TRAVEL),
        SourceDefinition(SourceId.WATER, R.string.source_water, UiCategory.OTHER),
        SourceDefinition(SourceId.SINGING_BOWL, R.string.source_singing_bowl, UiCategory.OTHER),
        SourceDefinition(SourceId.WHITE_NOISE, R.string.source_white_noise, UiCategory.OTHER),
        SourceDefinition(SourceId.PINK_NOISE, R.string.source_pink_noise, UiCategory.OTHER),
        SourceDefinition(SourceId.BROWN_NOISE, R.string.source_brown_noise, UiCategory.OTHER),
    )

    /** Pre-grouped once instead of filtering the complete catalog on every recomposition. */
    val byCategory: Map<UiCategory, List<SourceDefinition>> = all.groupBy(SourceDefinition::uiCategory)

    private val bySourceId: Map<SourceId, SourceDefinition> = all.associateBy(SourceDefinition::sourceId)

    fun definitionFor(sourceId: SourceId): SourceDefinition =
        requireNotNull(bySourceId[sourceId]) { "Unknown source id: $sourceId" }
}
