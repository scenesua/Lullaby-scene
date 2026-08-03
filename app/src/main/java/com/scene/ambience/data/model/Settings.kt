package com.scene.ambience.data.model

enum class ThemeMode { SYSTEM, LIGHT, DARK }

enum class FocusPolicy { PAUSE, DUCK, CONTINUE }

enum class NoisyPolicy { PAUSE }

/** Equalizer settings. [presetName] is a cosmetic label for the UI
 *  ("flat", "lpf", "hpf", "cut_both", "custom"); [bands] holds the
 *  per-band gain in millibels (0 = flat), indexed by band id. */
data class EqSettings(
    val enabled: Boolean = false,
    val presetName: String = "",
    val bands: List<Int> = emptyList(),
)
