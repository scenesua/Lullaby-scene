package com.scene.ambience.ui

import android.content.Context
import com.scene.ambience.R
import com.scene.ambience.data.model.AmbiencePreset
import com.scene.ambience.data.model.SourceId
import com.scene.ambience.data.model.SourceCatalog
import com.scene.ambience.data.model.UiCategory

/** Resource-backed display names so the UI never shows raw ids. */
object AmbienceStrings {

    fun presetName(context: Context, presetId: String?, userPresets: List<AmbiencePreset>): String {
        if (presetId == null) return context.getString(R.string.app_name)
        userPresets.firstOrNull { it.id == presetId }?.let { return it.name }
        return when (presetId) {
            "preset_rainy_cafe" -> context.getString(R.string.preset_rainy_cafe)
            "preset_forest_night" -> context.getString(R.string.preset_forest_night)
            "preset_beach" -> context.getString(R.string.preset_beach)
            "preset_cozy_fireplace" -> context.getString(R.string.preset_cozy_fireplace)
            "preset_train_journey" -> context.getString(R.string.preset_train_journey)
            "preset_city_night" -> context.getString(R.string.preset_city_night)
            "preset_thunderstorm" -> context.getString(R.string.preset_thunderstorm)
            "preset_forest_morning" -> context.getString(R.string.preset_forest_morning)
            "preset_bamboo_meditation" -> context.getString(R.string.preset_bamboo_meditation)
            "preset_deep_focus" -> context.getString(R.string.preset_deep_focus)
            "preset_quiet_night" -> context.getString(R.string.preset_quiet_night)
            "preset_morning_birds" -> context.getString(R.string.preset_morning_birds)
            "preset_ocean_waves" -> context.getString(R.string.preset_ocean_waves)
            "preset_rainy_night" -> context.getString(R.string.preset_rainy_night)
            "preset_fan_room" -> context.getString(R.string.preset_fan_room)
            "preset_cafe_focus" -> context.getString(R.string.preset_cafe_focus)
            "preset_simple_aircraft" -> context.getString(R.string.preset_simple_aircraft)
            "preset_simple_train" -> context.getString(R.string.preset_simple_train)
            "preset_simple_ferry" -> context.getString(R.string.preset_simple_ferry)
            "preset_simple_spacecraft" -> context.getString(R.string.preset_simple_spacecraft)
            "preset_simple_submarine" -> context.getString(R.string.preset_simple_submarine)
            "preset_winter_lighthouse" -> context.getString(R.string.preset_winter_lighthouse)
            "preset_harbor_cabin" -> context.getString(R.string.preset_harbor_cabin)
            "preset_polar_night_train" -> context.getString(R.string.preset_polar_night_train)
            else -> presetId
        }
    }

    fun sourceName(context: Context, sourceId: String): String {
        val source = SourceId.fromId(sourceId) ?: return sourceId
        return context.getString(SourceCatalog.definitionFor(source).displayNameRes)
    }

    fun categoryName(context: Context, category: UiCategory): String = when (category) {
        UiCategory.NATURE -> context.getString(R.string.category_nature)
        UiCategory.INDOOR -> context.getString(R.string.category_indoor)
        UiCategory.TRAVEL -> context.getString(R.string.category_travel)
        UiCategory.OTHER -> context.getString(R.string.category_other)
    }

    fun densityLabel(context: Context, density: String): String = when (density) {
        "low" -> context.getString(R.string.density_low)
        "medium" -> context.getString(R.string.density_medium)
        "medium-high" -> context.getString(R.string.density_medium_high)
        "high" -> context.getString(R.string.density_high)
        else -> density
    }

    fun messageText(context: Context, messageKey: String): String? = when (messageKey) {
        "no_active_sources" -> context.getString(R.string.msg_no_active_sources)
        "no_engine_snapshot" -> context.getString(R.string.msg_no_engine_snapshot)
        "focus_lost_paused" -> context.getString(R.string.msg_focus_lost_paused)
        "focus_paused" -> context.getString(R.string.msg_focus_paused)
        "noisy_paused" -> context.getString(R.string.msg_noisy_paused)
        "source_failed" -> context.getString(R.string.msg_source_failed)
        "scene_aircraft_unavailable" -> context.getString(R.string.scene_aircraft_unavailable)
        "scene_train_unavailable" -> context.getString(R.string.scene_train_unavailable)
        "scene_ferry_unavailable" -> context.getString(R.string.scene_ferry_unavailable)
        "scene_spacecraft_unavailable" -> context.getString(R.string.scene_spacecraft_unavailable)
        "scene_submarine_unavailable" -> context.getString(R.string.scene_submarine_unavailable)
        else -> null
    }

    fun formatCountdown(ms: Long): String {
        val totalSeconds = (ms / 1000).coerceAtLeast(0L)
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        return if (hours > 0) {
            String.format("%d:%02d:%02d", hours, minutes, seconds)
        } else {
            String.format("%02d:%02d", minutes, seconds)
        }
    }
}
