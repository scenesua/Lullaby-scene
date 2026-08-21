package com.scene.ambience.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.scene.ambience.data.model.AmbiencePreset
import com.scene.ambience.data.model.EqSettings
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.FxSettings
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.NoisyPolicy
import com.scene.ambience.data.model.ThemeMode
import com.scene.ambience.data.model.UserPresetsFile
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.serialization.json.Json

private val Context.dataStore by preferencesDataStore(name = "ambience_settings")

data class AppSettings(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val focusPolicy: FocusPolicy = FocusPolicy.PAUSE,
    val noisyPolicy: NoisyPolicy = NoisyPolicy.PAUSE,
    val timerDefaultMinutes: Int = 30,
    val timerFadeSeconds: Int = 60,
    val restoreLastMix: Boolean = true,
    val includePrereleaseUpdates: Boolean = false,
    val notificationPermissionAsked: Boolean = false,
    val libraryVersion: Int? = null,
    val expandedCategories: Set<String> = emptySet(),
    val lastMix: MixState? = null,
    val lastPresetId: String? = null,
    val sleepTimerEndEpochMs: Long? = null,
    val sleepTimerFadeMs: Long? = null,
    val userPresets: List<AmbiencePreset> = emptyList(),
    val eqSettings: EqSettings = EqSettings(),
    val fxSettings: FxSettings = FxSettings(),
)

class SettingsRepository(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private object Keys {
        val theme = stringPreferencesKey("theme_mode")
        val focus = stringPreferencesKey("focus_policy")
        val noisy = stringPreferencesKey("noisy_policy")
        val timerMinutes = intPreferencesKey("timer_default_minutes")
        val timerFadeSeconds = intPreferencesKey("timer_fade_seconds")
        val restoreMix = booleanPreferencesKey("restore_last_mix")
        val includePrereleaseUpdates = booleanPreferencesKey("include_prerelease_updates")
        val notifAsked = booleanPreferencesKey("notification_permission_asked")
        val libVersion = intPreferencesKey("library_version")
        val expanded = stringSetPreferencesKey("expanded_categories")
        val lastMix = stringPreferencesKey("last_mix_json")
        val lastPreset = stringPreferencesKey("last_preset_id")
        val timerEnd = longPreferencesKey("sleep_timer_end_epoch_ms")
        val timerFade = longPreferencesKey("sleep_timer_fade_ms")
        val userPresets = stringPreferencesKey("user_presets_json")
        val eqEnabled = booleanPreferencesKey("eq_enabled")
        val eqPreset = stringPreferencesKey("eq_preset")
        val eqBands = stringPreferencesKey("eq_bands")
        val fxEnabled = booleanPreferencesKey("fx_enabled")
        val fxWarmth = floatPreferencesKey("fx_warmth")
        val fxAir = floatPreferencesKey("fx_air")
        val fxBody = floatPreferencesKey("fx_body")
        val fxSpace = floatPreferencesKey("fx_space")
        val fxGlue = floatPreferencesKey("fx_glue")
        val fxLoudness = floatPreferencesKey("fx_loudness")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { p ->
        AppSettings(
            themeMode = runCatching { ThemeMode.valueOf(p[Keys.theme] ?: "SYSTEM") }.getOrDefault(ThemeMode.SYSTEM),
            focusPolicy = runCatching { FocusPolicy.valueOf(p[Keys.focus] ?: "PAUSE") }.getOrDefault(FocusPolicy.PAUSE),
            noisyPolicy = runCatching { NoisyPolicy.valueOf(p[Keys.noisy] ?: "PAUSE") }.getOrDefault(NoisyPolicy.PAUSE),
            timerDefaultMinutes = p[Keys.timerMinutes] ?: 30,
            timerFadeSeconds = p[Keys.timerFadeSeconds] ?: 60,
            restoreLastMix = p[Keys.restoreMix] ?: true,
            includePrereleaseUpdates = p[Keys.includePrereleaseUpdates] ?: false,
            notificationPermissionAsked = p[Keys.notifAsked] ?: false,
            libraryVersion = p[Keys.libVersion],
            expandedCategories = p[Keys.expanded] ?: emptySet(),
            lastMix = p[Keys.lastMix]?.let { runCatching { json.decodeFromString<MixState>(it) }.getOrNull() },
            lastPresetId = p[Keys.lastPreset],
            sleepTimerEndEpochMs = p[Keys.timerEnd],
            sleepTimerFadeMs = p[Keys.timerFade],
            userPresets = p[Keys.userPresets]?.let {
                runCatching { json.decodeFromString<UserPresetsFile>(it).presets }.getOrDefault(emptyList())
            } ?: emptyList(),
            eqSettings = EqSettings(
                enabled = p[Keys.eqEnabled] ?: false,
                presetName = p[Keys.eqPreset] ?: "",
                bands = p[Keys.eqBands]?.let { csv ->
                    runCatching { csv.split(',').mapNotNull { it.trim().toIntOrNull() } }.getOrDefault(emptyList())
                } ?: emptyList(),
            ),
            fxSettings = FxSettings(
                enabled = p[Keys.fxEnabled] ?: true,
                warmth = p[Keys.fxWarmth] ?: 0f,
                air = p[Keys.fxAir] ?: 0f,
                body = p[Keys.fxBody] ?: 0f,
                space = p[Keys.fxSpace] ?: 0f,
                glue = p[Keys.fxGlue] ?: 0f,
                loudness = p[Keys.fxLoudness] ?: 0f,
            ).normalized(),
        )
    }

    val settingsFlow: StateFlow<AppSettings> =
        settings.stateIn(scope, SharingStarted.Eagerly, AppSettings())

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { it[Keys.theme] = mode.name }
    }

    suspend fun setFocusPolicy(policy: FocusPolicy) {
        context.dataStore.edit { it[Keys.focus] = policy.name }
    }

    suspend fun setNoisyPolicy(policy: NoisyPolicy) {
        context.dataStore.edit { it[Keys.noisy] = policy.name }
    }

    suspend fun setTimerDefaults(minutes: Int, fadeSeconds: Int) {
        context.dataStore.edit {
            it[Keys.timerMinutes] = minutes
            it[Keys.timerFadeSeconds] = fadeSeconds
        }
    }

    suspend fun setRestoreLastMix(enabled: Boolean) {
        context.dataStore.edit { it[Keys.restoreMix] = enabled }
    }

    suspend fun setIncludePrereleaseUpdates(enabled: Boolean) {
        context.dataStore.edit { it[Keys.includePrereleaseUpdates] = enabled }
    }

    suspend fun setNotificationPermissionAsked(asked: Boolean) {
        context.dataStore.edit { it[Keys.notifAsked] = asked }
    }

    suspend fun setExpandedCategories(categories: Set<String>) {
        context.dataStore.edit { it[Keys.expanded] = categories }
    }

    suspend fun setLibraryVersion(version: Int) {
        context.dataStore.edit { it[Keys.libVersion] = version }
    }

    suspend fun saveLastMix(mix: MixState, presetId: String?) {
        context.dataStore.edit {
            it[Keys.lastMix] = json.encodeToString(MixState.serializer(), mix)
            if (presetId != null) it[Keys.lastPreset] = presetId else it.remove(Keys.lastPreset)
        }
    }

    suspend fun saveSleepTimer(endEpochMs: Long, fadeMs: Long) {
        context.dataStore.edit {
            it[Keys.timerEnd] = endEpochMs
            it[Keys.timerFade] = fadeMs
        }
    }

    suspend fun clearSleepTimer() {
        context.dataStore.edit {
            it.remove(Keys.timerEnd)
            it.remove(Keys.timerFade)
        }
    }

    suspend fun saveUserPresets(presets: List<AmbiencePreset>) {
        context.dataStore.edit {
            it[Keys.userPresets] = json.encodeToString(UserPresetsFile.serializer(), UserPresetsFile(presets = presets))
        }
    }

    suspend fun setEqSettings(eq: EqSettings) {
        context.dataStore.edit {
            it[Keys.eqEnabled] = eq.enabled
            it[Keys.eqPreset] = eq.presetName
            it[Keys.eqBands] = eq.bands.joinToString(",")
        }
    }

    suspend fun setFxSettings(fx: FxSettings) {
        val value = fx.normalized()
        context.dataStore.edit {
            it[Keys.fxEnabled] = value.enabled
            it[Keys.fxWarmth] = value.warmth
            it[Keys.fxAir] = value.air
            it[Keys.fxBody] = value.body
            it[Keys.fxSpace] = value.space
            it[Keys.fxGlue] = value.glue
            it[Keys.fxLoudness] = value.loudness
        }
    }
}
