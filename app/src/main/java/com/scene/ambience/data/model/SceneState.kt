package com.scene.ambience.data.model

import kotlinx.serialization.Serializable

/** Semantic controls shared between the scene UI and playback service. */
@Serializable
data class SceneMacroState(
    /** 0 = engine feels far away, 1 = engine feels close/present. */
    val enginePresence: Float = 0.62f,
    /** Amount of audible cabin detail from the field recording. */
    val cabinActivity: Float = 0.34f,
    /** Subtle low-frequency movement and gain modulation. */
    val turbulence: Float = 0.12f,
    /** 0 = neutral, 1 = darker/softer late-night sound. */
    val nightDepth: Float = 0.78f,
)

/** Scene state pushed alongside the normal engine snapshot through MediaSession extras. */
@Serializable
data class SceneRuntimeSnapshot(
    val sceneId: String? = null,
    val stateId: String? = null,
    val arcMinutes: Int = 60,
    val elapsedMs: Long = 0L,
    val macros: SceneMacroState = SceneMacroState(),
) {
    val active: Boolean get() = sceneId != null
}
