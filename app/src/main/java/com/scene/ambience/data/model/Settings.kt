package com.scene.ambience.data.model

enum class ThemeMode { SYSTEM, LIGHT, DARK }

enum class FocusPolicy { PAUSE, DUCK, CONTINUE }

enum class NoisyPolicy { PAUSE }

/** Equalizer settings. [presetName] is a cosmetic label for the UI;
 * [bands] holds the per-band gain in millibels (0 = flat), indexed by band id. */
data class EqSettings(
    val enabled: Boolean = false,
    val presetName: String = "",
    val bands: List<Int> = emptyList(),
)

/** Global internal FX rack. All macro values are normalized 0f..1f.
 * Zero-valued controls are transparent, so enabling the rack does not alter
 * existing mixes until the user moves a control. */
data class FxSettings(
    val enabled: Boolean = true,
    val warmth: Float = 0f,
    val air: Float = 0f,
    val body: Float = 0f,
    val space: Float = 0f,
    val glue: Float = 0f,
    val loudness: Float = 0f,
) {
    fun normalized(): FxSettings = copy(
        warmth = warmth.coerceIn(0f, 1f),
        air = air.coerceIn(0f, 1f),
        body = body.coerceIn(0f, 1f),
        space = space.coerceIn(0f, 1f),
        glue = glue.coerceIn(0f, 1f),
        loudness = loudness.coerceIn(0f, 1f),
    )
}
