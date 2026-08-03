package com.scene.ambience.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AmbiencePreset(
    val id: String,
    val name: String,
    val mix: MixState,
    val eventDensity: String = "medium",
    val changeAmount: Float = 1f,
    val randomSeed: Long? = null,
)

@Serializable
data class UserPresetsFile(
    val version: Int = 1,
    val presets: List<AmbiencePreset> = emptyList(),
)
