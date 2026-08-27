package com.scene.ambience.data.model

import androidx.annotation.StringRes
import com.scene.ambience.R

/** Canonical catalog of user-visible sound sources. */
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
    LIGHTHOUSE("lighthouse"),
    AIRCRAFT_CABIN("aircraft_cabin"),
    TRAIN_JOURNEY_DEPARTURE("train_journey_departure"),
    TRAIN_JOURNEY_BED("train_journey_bed"),
    TRAIN_JOURNEY_ARRIVAL("train_journey_arrival"),
    FERRY_JOURNEY_DEPARTURE("ferry_journey_departure"),
    FERRY_JOURNEY_BED("ferry_journey_bed"),
    FERRY_JOURNEY_ARRIVAL("ferry_journey_arrival"),
    SPACECRAFT_JOURNEY_TRANSITION("spacecraft_journey_transition"),
    SPACECRAFT_JOURNEY_BED("spacecraft_journey_bed"),
    SUBMARINE_JOURNEY_DEPARTURE("submarine_journey_departure"),
    SUBMARINE_JOURNEY_ENGINE_BED("submarine_journey_engine_bed"),
    SUBMARINE_JOURNEY_WATER_BED("submarine_journey_water_bed"),
    SUBMARINE_JOURNEY_ARRIVAL("submarine_journey_arrival"),
    SUBMARINE_SONAR("submarine_sonar"),
    FOREST_TEMPLE_BOWL("forest_temple_bowl"),
    FOREST_TEMPLE_PATH_WALK("forest_temple_path_walk"),
    FOREST_TEMPLE_MOKTAK("forest_temple_moktak"),
    FOREST_TEMPLE_GRAVEL("forest_temple_gravel"),
    FOREST_TEMPLE_HEART_SUTRA("forest_temple_heart_sutra"),
    HOOD_JOURNEY_BED("hood_journey_bed"),
    HOOD_GUNSHOT("hood_gunshot"),
    HOOD_SIREN("hood_siren"),
    HOOD_GLASS("hood_glass"),
    HOOD_SHOUT("hood_shout"),
    HOOD_FOOTSTEPS("hood_footsteps"),
    HOOD_CAR_PASS("hood_car_pass"),
    HOOD_CAR_DOOR("hood_car_door"),
    HOOD_HELICOPTER("hood_helicopter"),
    HOOD_DOG("hood_dog"),
    FAN("fan"),
    VENTILATION("ventilation"),
    WATER("water"),
    SINGING_BOWL("singing_bowl"),
    BAMBOO_FOREST("bamboo_forest"),
    SNOWY_NIGHT("snowy_night"),
    WHITE_NOISE("white_noise"),
    PINK_NOISE("pink_noise"),
    BROWN_NOISE("brown_noise");

    companion object {
        private val byId = entries.associateBy { it.id }
        fun fromId(id: String): SourceId? = byId[id]
    }
}

enum class UiCategory(val id: String) {
    NATURE("nature"),
    INDOOR("indoor"),
    TRAVEL("travel"),
    OTHER("other"),
    JOURNEY_EVENTS("journey_events"),
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
        SourceDefinition(SourceId.SNOWY_NIGHT, R.string.source_snowy_night, UiCategory.NATURE),
        SourceDefinition(SourceId.FIRE, R.string.source_fire, UiCategory.INDOOR),
        SourceDefinition(SourceId.CAFE, R.string.source_cafe, UiCategory.INDOOR),
        SourceDefinition(SourceId.FAN, R.string.source_fan, UiCategory.INDOOR),
        SourceDefinition(SourceId.VENTILATION, R.string.source_ventilation, UiCategory.INDOOR),
        SourceDefinition(SourceId.CITY, R.string.source_city, UiCategory.TRAVEL),
        SourceDefinition(SourceId.TRAIN, R.string.source_train, UiCategory.TRAVEL),
        SourceDefinition(SourceId.LIGHTHOUSE, R.string.source_lighthouse, UiCategory.TRAVEL),
        SourceDefinition(SourceId.AIRCRAFT_CABIN, R.string.source_aircraft_cabin, UiCategory.TRAVEL),
        SourceDefinition(SourceId.TRAIN_JOURNEY_DEPARTURE, R.string.source_train_journey_departure, UiCategory.TRAVEL),
        SourceDefinition(SourceId.TRAIN_JOURNEY_BED, R.string.source_train_journey_bed, UiCategory.TRAVEL),
        SourceDefinition(SourceId.TRAIN_JOURNEY_ARRIVAL, R.string.source_train_journey_arrival, UiCategory.TRAVEL),
        SourceDefinition(SourceId.FERRY_JOURNEY_DEPARTURE, R.string.source_ferry_journey_departure, UiCategory.TRAVEL),
        SourceDefinition(SourceId.FERRY_JOURNEY_BED, R.string.source_ferry_journey_bed, UiCategory.TRAVEL),
        SourceDefinition(SourceId.FERRY_JOURNEY_ARRIVAL, R.string.source_ferry_journey_arrival, UiCategory.TRAVEL),
        SourceDefinition(SourceId.SPACECRAFT_JOURNEY_TRANSITION, R.string.source_spacecraft_journey_transition, UiCategory.TRAVEL),
        SourceDefinition(SourceId.SPACECRAFT_JOURNEY_BED, R.string.source_spacecraft_journey_bed, UiCategory.TRAVEL),
        SourceDefinition(SourceId.SUBMARINE_JOURNEY_DEPARTURE, R.string.source_submarine_journey_departure, UiCategory.TRAVEL),
        SourceDefinition(SourceId.SUBMARINE_JOURNEY_ENGINE_BED, R.string.source_submarine_journey_engine_bed, UiCategory.TRAVEL),
        SourceDefinition(SourceId.SUBMARINE_JOURNEY_WATER_BED, R.string.source_submarine_journey_water_bed, UiCategory.TRAVEL),
        SourceDefinition(SourceId.SUBMARINE_JOURNEY_ARRIVAL, R.string.source_submarine_journey_arrival, UiCategory.TRAVEL),
        SourceDefinition(SourceId.SUBMARINE_SONAR, R.string.source_submarine_sonar, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.FOREST_TEMPLE_BOWL, R.string.source_forest_temple_bowl, UiCategory.TRAVEL),
        SourceDefinition(SourceId.FOREST_TEMPLE_PATH_WALK, R.string.source_forest_temple_path_walk, UiCategory.TRAVEL),
        SourceDefinition(SourceId.FOREST_TEMPLE_MOKTAK, R.string.source_forest_temple_moktak, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.FOREST_TEMPLE_GRAVEL, R.string.source_forest_temple_gravel, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.FOREST_TEMPLE_HEART_SUTRA, R.string.source_forest_temple_heart_sutra, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_JOURNEY_BED, R.string.source_hood_journey_bed, UiCategory.TRAVEL),
        SourceDefinition(SourceId.HOOD_GUNSHOT, R.string.source_hood_gunshot, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_SIREN, R.string.source_hood_siren, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_GLASS, R.string.source_hood_glass, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_SHOUT, R.string.source_hood_shout, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_FOOTSTEPS, R.string.source_hood_footsteps, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_CAR_PASS, R.string.source_hood_car_pass, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_CAR_DOOR, R.string.source_hood_car_door, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_HELICOPTER, R.string.source_hood_helicopter, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.HOOD_DOG, R.string.source_hood_dog, UiCategory.JOURNEY_EVENTS),
        SourceDefinition(SourceId.WATER, R.string.source_water, UiCategory.OTHER),
        SourceDefinition(SourceId.SINGING_BOWL, R.string.source_singing_bowl, UiCategory.OTHER),
        SourceDefinition(SourceId.WHITE_NOISE, R.string.source_white_noise, UiCategory.OTHER),
        SourceDefinition(SourceId.PINK_NOISE, R.string.source_pink_noise, UiCategory.OTHER),
        SourceDefinition(SourceId.BROWN_NOISE, R.string.source_brown_noise, UiCategory.OTHER),
    )

    private val byId: Map<SourceId, SourceDefinition> = all.associateBy { it.sourceId }
    val byCategory: Map<UiCategory, List<SourceDefinition>> = UiCategory.entries.associateWith { category ->
        all.filter { it.uiCategory == category }
    }

    fun definitionFor(sourceId: SourceId): SourceDefinition = byId.getValue(sourceId)
}
