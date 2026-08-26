package com.scene.ambience.data

import com.scene.ambience.data.model.AmbiencePreset
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.SourceState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID

/**
 * Built-in presets (section 37). Only sources that actually have packaged
 * assets are referenced; the caller filters against the library state.
 */
object BuiltInPresets {

    fun createAll(): List<AmbiencePreset> {
        fun s(id: String, volume: Float) = SourceState(id = id, enabled = volume > 0f, volume = volume)
        fun preset(id: String, master: Float, density: String, vararg sources: Pair<String, Float>) =
            AmbiencePreset(
                id = id,
                name = id,
                mix = MixState(
                    masterVolume = master,
                    sources = sources.associate { (sourceId, volume) -> sourceId to s(sourceId, volume) },
                ),
                eventDensity = density,
            )

        return listOf(
            AmbiencePreset(
                id = "preset_rainy_cafe",
                name = "preset_rainy_cafe",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "rain" to s("rain", 0.5f),
                        "cafe" to s("cafe", 0.35f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_forest_night",
                name = "preset_forest_night",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "forest" to s("forest", 0.4f),
                        "crickets" to s("crickets", 0.25f),
                        "wind" to s("wind", 0.15f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_beach",
                name = "preset_beach",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "ocean" to s("ocean", 0.5f),
                        "wind" to s("wind", 0.3f),
                    ),
                ),
                eventDensity = "low",
            ),
            AmbiencePreset(
                id = "preset_cozy_fireplace",
                name = "preset_cozy_fireplace",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "fire" to s("fire", 0.5f),
                        "rain" to s("rain", 0.25f),
                    ),
                ),
                eventDensity = "medium-high",
            ),
            AmbiencePreset(
                id = "preset_train_journey",
                name = "preset_train_journey",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "train" to s("train", 0.5f),
                        "city" to s("city", 0.2f),
                    ),
                ),
                eventDensity = "low",
            ),
            AmbiencePreset(
                id = "preset_city_night",
                name = "preset_city_night",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "city" to s("city", 0.4f),
                        "rain" to s("rain", 0.3f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_thunderstorm",
                name = "preset_thunderstorm",
                mix = MixState(
                    masterVolume = 0.65f,
                    sources = mapOf(
                        "rain" to s("rain", 0.45f),
                        "thunder" to s("thunder", 0.3f),
                        "wind" to s("wind", 0.18f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_forest_morning",
                name = "preset_forest_morning",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "forest" to s("forest", 0.5f),
                        "stream" to s("stream", 0.2f),
                        "wind" to s("wind", 0.15f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_bamboo_meditation",
                name = "preset_bamboo_meditation",
                mix = MixState(
                    masterVolume = 0.65f,
                    sources = mapOf(
                        "bamboo_forest" to s("bamboo_forest", 0.4f),
                        "singing_bowl" to s("singing_bowl", 0.3f),
                        "stream" to s("stream", 0.12f),
                    ),
                ),
                eventDensity = "low",
            ),
            AmbiencePreset(
                id = "preset_deep_focus",
                name = "preset_deep_focus",
                mix = MixState(
                    masterVolume = 0.65f,
                    sources = mapOf(
                        "pink_noise" to s("pink_noise", 0.35f),
                        "brown_noise" to s("brown_noise", 0.22f),
                        "cafe" to s("cafe", 0.12f),
                    ),
                ),
                eventDensity = "low",
            ),
            AmbiencePreset(
                id = "preset_quiet_night",
                name = "preset_quiet_night",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "brown_noise" to s("brown_noise", 0.35f),
                        "crickets" to s("crickets", 0.2f),
                        "wind" to s("wind", 0.1f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_morning_birds",
                name = "preset_morning_birds",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "birds" to s("birds", 0.45f),
                        "forest" to s("forest", 0.3f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_ocean_waves",
                name = "preset_ocean_waves",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "ocean" to s("ocean", 0.45f),
                        "white_noise" to s("white_noise", 0.12f),
                    ),
                ),
                eventDensity = "low",
            ),
            AmbiencePreset(
                id = "preset_rainy_night",
                name = "preset_rainy_night",
                mix = MixState(
                    masterVolume = 0.7f,
                    sources = mapOf(
                        "rain" to s("rain", 0.5f),
                        "brown_noise" to s("brown_noise", 0.2f),
                    ),
                ),
                eventDensity = "medium",
            ),
            AmbiencePreset(
                id = "preset_fan_room",
                name = "preset_fan_room",
                mix = MixState(
                    masterVolume = 0.65f,
                    sources = mapOf(
                        "fan" to s("fan", 0.45f),
                        "pink_noise" to s("pink_noise", 0.2f),
                    ),
                ),
                eventDensity = "low",
            ),
            AmbiencePreset(
                id = "preset_cafe_focus",
                name = "preset_cafe_focus",
                mix = MixState(
                    masterVolume = 0.65f,
                    sources = mapOf(
                        "cafe" to s("cafe", 0.35f),
                        "pink_noise" to s("pink_noise", 0.2f),
                    ),
                ),
                eventDensity = "low",
            ),
            preset("preset_simple_aircraft", 0.65f, "low", "aircraft_cabin" to 0.5f),
            preset("preset_simple_train", 0.65f, "low", "train_journey_bed" to 0.5f),
            preset("preset_simple_ferry", 0.65f, "low", "ferry_journey_bed" to 0.46f),
            preset("preset_simple_spacecraft", 0.62f, "low", "spacecraft_journey_bed" to 0.48f),
            preset(
                "preset_simple_submarine", 0.62f, "low",
                "submarine_journey_engine_bed" to 0.32f,
                "submarine_journey_water_bed" to 0.34f,
                "submarine_sonar" to 0.08f,
            ),
            preset(
                "preset_simple_forest_temple", 0.62f, "low",
                "forest" to 0.34f,
                "birds" to 0.16f,
                "forest_temple_bowl" to 0.09f,
            ),
            preset(
                "preset_winter_lighthouse", 0.65f, "low",
                "snowy_night" to 0.38f, "lighthouse" to 0.25f, "wind" to 0.1f,
            ),
            preset(
                "preset_harbor_cabin", 0.65f, "low",
                "ferry_journey_bed" to 0.35f, "ocean" to 0.22f, "lighthouse" to 0.14f,
            ),
            preset(
                "preset_polar_night_train", 0.65f, "low",
                "train_journey_bed" to 0.38f, "snowy_night" to 0.28f, "brown_noise" to 0.1f,
            ),
        )
    }
}

class PresetRepository(
    private val settingsRepository: SettingsRepository,
) {

    val userPresets: Flow<List<AmbiencePreset>> = settingsRepository.settings.map { it.userPresets }

    suspend fun savePreset(name: String, mix: MixState, current: List<AmbiencePreset>): AmbiencePreset {
        val preset = AmbiencePreset(
            id = "user_${UUID.randomUUID().toString().take(8)}",
            name = name,
            mix = mix,
        )
        settingsRepository.saveUserPresets(current + preset)
        return preset
    }

    suspend fun renamePreset(id: String, newName: String, current: List<AmbiencePreset>) {
        settingsRepository.saveUserPresets(
            current.map { if (it.id == id) it.copy(name = newName) else it }
        )
    }

    suspend fun deletePreset(id: String, current: List<AmbiencePreset>) {
        settingsRepository.saveUserPresets(current.filterNot { it.id == id })
    }
}
