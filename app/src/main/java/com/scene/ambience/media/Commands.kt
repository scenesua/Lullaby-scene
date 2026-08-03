package com.scene.ambience.media

import android.os.Bundle
import androidx.media3.session.SessionCommand
import com.scene.ambience.data.model.EngineSnapshot
import kotlinx.serialization.json.Json

/**
 * Custom session command protocol between the app UI and AmbiencePlaybackService.
 * Standard play/pause/stop go through MediaSession as usual; everything
 * mixer-specific uses these commands. Engine state is pushed back through
 * session extras under [EXTRA_SNAPSHOT].
 */
object Commands {
    const val SET_MASTER_VOLUME = "com.scene.ambience.cmd.set_master_volume"
    const val SET_MASTER_MUTED = "com.scene.ambience.cmd.set_master_muted"
    const val SET_SOURCE_VOLUME = "com.scene.ambience.cmd.set_source_volume"
    const val SET_SOURCE_MUTED = "com.scene.ambience.cmd.set_source_muted"
    const val APPLY_MIX = "com.scene.ambience.cmd.apply_mix"
    const val DISABLE_ALL_SOURCES = "com.scene.ambience.cmd.disable_all_sources"
    const val START_SLEEP_TIMER = "com.scene.ambience.cmd.start_sleep_timer"
    const val CANCEL_SLEEP_TIMER = "com.scene.ambience.cmd.cancel_sleep_timer"
    const val CLEAR_MESSAGE = "com.scene.ambience.cmd.clear_message"
    const val SET_EQ = "com.scene.ambience.cmd.set_eq"

    const val EXTRA_SNAPSHOT = "ambience.snapshot"
    const val EXTRA_VOLUME = "volume"
    const val EXTRA_MUTED = "muted"
    const val EXTRA_SOURCE_ID = "source_id"
    const val EXTRA_MIX_JSON = "mix_json"
    const val EXTRA_PRESET_ID = "preset_id"
    const val EXTRA_DURATION_MS = "duration_ms"
    const val EXTRA_FADE_MS = "fade_ms"
    const val EXTRA_EQ_ENABLED = "eq_enabled"

    const val EXTRA_EQ_PRESET = "eq_preset"

    const val EXTRA_EQ_BANDS = "eq_bands"
    private val json = Json { ignoreUnknownKeys = true }

    fun setMasterVolume(volume: Float): SessionCommand =
        SessionCommand(SET_MASTER_VOLUME, Bundle().apply { putFloat(EXTRA_VOLUME, volume) })

    fun setMasterMuted(muted: Boolean): SessionCommand =
        SessionCommand(SET_MASTER_MUTED, Bundle().apply { putBoolean(EXTRA_MUTED, muted) })

    fun setSourceVolume(id: String, volume: Float): SessionCommand =
        SessionCommand(SET_SOURCE_VOLUME, Bundle().apply {
            putString(EXTRA_SOURCE_ID, id)
            putFloat(EXTRA_VOLUME, volume)
        })

    fun setSourceMuted(id: String, muted: Boolean): SessionCommand =
        SessionCommand(SET_SOURCE_MUTED, Bundle().apply {
            putString(EXTRA_SOURCE_ID, id)
            putBoolean(EXTRA_MUTED, muted)
        })

    fun applyMix(mixJson: String, presetId: String?): SessionCommand =
        SessionCommand(APPLY_MIX, Bundle().apply {
            putString(EXTRA_MIX_JSON, mixJson)
            putString(EXTRA_PRESET_ID, presetId)
        })

    fun startSleepTimer(durationMs: Long, fadeMs: Long): SessionCommand =
        SessionCommand(START_SLEEP_TIMER, Bundle().apply {
            putLong(EXTRA_DURATION_MS, durationMs)
            putLong(EXTRA_FADE_MS, fadeMs)
        })

    val cancelSleepTimer: SessionCommand = SessionCommand(CANCEL_SLEEP_TIMER, Bundle())

    val clearMessage: SessionCommand = SessionCommand(CLEAR_MESSAGE, Bundle())

    val disableAllSources: SessionCommand = SessionCommand(DISABLE_ALL_SOURCES, Bundle())

    fun setEqualizer(enabled: Boolean, presetName: String, bands: List<Int>): SessionCommand =
        SessionCommand(SET_EQ, Bundle().apply {
            putBoolean(EXTRA_EQ_ENABLED, enabled)
            putString(EXTRA_EQ_PRESET, presetName)
            putIntegerArrayList(EXTRA_EQ_BANDS, ArrayList(bands))
        })

    /** All commands advertised on session connect. */
    val sessionCommands: List<SessionCommand> = listOf(
        SessionCommand(SET_MASTER_VOLUME, Bundle()),
        SessionCommand(SET_MASTER_MUTED, Bundle()),
        SessionCommand(SET_SOURCE_VOLUME, Bundle()),
        SessionCommand(SET_SOURCE_MUTED, Bundle()),
        SessionCommand(APPLY_MIX, Bundle()),
        SessionCommand(DISABLE_ALL_SOURCES, Bundle()),
        SessionCommand(START_SLEEP_TIMER, Bundle()),
        cancelSleepTimer,
        clearMessage,
        SessionCommand(SET_EQ, Bundle()),
    )

    fun snapshotBundle(snapshot: EngineSnapshot): Bundle =
        Bundle().apply { putString(EXTRA_SNAPSHOT, json.encodeToString(EngineSnapshot.serializer(), snapshot)) }

    fun parseSnapshot(extras: Bundle): EngineSnapshot? {
        val raw = extras.getString(EXTRA_SNAPSHOT) ?: return null
        return runCatching { json.decodeFromString(EngineSnapshot.serializer(), raw) }.getOrNull()
    }
}
