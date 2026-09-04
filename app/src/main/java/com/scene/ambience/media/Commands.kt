package com.scene.ambience.media

import android.os.Bundle
import androidx.media3.session.SessionCommand
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.data.model.FxSettings
import com.scene.ambience.data.model.SceneRuntimeSnapshot
import kotlinx.serialization.json.Json

/** Custom MediaSession protocol between UI and the playback service. */
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
    const val SET_FX = "com.scene.ambience.cmd.set_fx"
    const val START_SCENE = "com.scene.ambience.cmd.start_scene"
    const val STOP_SCENE = "com.scene.ambience.cmd.stop_scene"
    const val SET_SCENE_MACRO = "com.scene.ambience.cmd.set_scene_macro"
    // Kept for protocol compatibility with alpha.2; value now means whole journey duration.
    const val SET_SCENE_ARC = "com.scene.ambience.cmd.set_scene_arc"
    const val SEEK_SCENE = "com.scene.ambience.cmd.seek_scene"
    const val STEP_SCENE_PHASE = "com.scene.ambience.cmd.step_scene_phase"
    const val SET_SCENE_RANDOM_EVENTS = "com.scene.ambience.cmd.set_scene_random_events"

    const val EXTRA_SNAPSHOT = "ambience.snapshot"
    const val EXTRA_SCENE_SNAPSHOT = "ambience.scene_snapshot"
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
    const val EXTRA_FX_ENABLED = "fx_enabled"
    const val EXTRA_FX_WARMTH = "fx_warmth"
    const val EXTRA_FX_AIR = "fx_air"
    const val EXTRA_FX_BODY = "fx_body"
    const val EXTRA_FX_SPACE = "fx_space"
    const val EXTRA_FX_GLUE = "fx_glue"
    const val EXTRA_FX_LOUDNESS = "fx_loudness"
    const val EXTRA_SCENE_ID = "scene_id"
    const val EXTRA_ARC_MINUTES = "arc_minutes"
    const val EXTRA_MACRO_KEY = "macro_key"
    const val EXTRA_MACRO_VALUE = "macro_value"
    const val EXTRA_ELAPSED_MS = "elapsed_ms"
    const val EXTRA_DIRECTION = "direction"
    const val EXTRA_ENABLED = "enabled"
    const val EXTRA_SCENE_SOURCES = "scene_sources"

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

    fun setFx(settings: FxSettings): SessionCommand {
        val fx = settings.normalized()
        return SessionCommand(SET_FX, Bundle().apply {
            putBoolean(EXTRA_FX_ENABLED, fx.enabled)
            putFloat(EXTRA_FX_WARMTH, fx.warmth)
            putFloat(EXTRA_FX_AIR, fx.air)
            putFloat(EXTRA_FX_BODY, fx.body)
            putFloat(EXTRA_FX_SPACE, fx.space)
            putFloat(EXTRA_FX_GLUE, fx.glue)
            putFloat(EXTRA_FX_LOUDNESS, fx.loudness)
        })
    }

    fun fxFrom(args: Bundle): FxSettings = FxSettings(
        enabled = args.getBoolean(EXTRA_FX_ENABLED, true),
        warmth = args.getFloat(EXTRA_FX_WARMTH, 0f),
        air = args.getFloat(EXTRA_FX_AIR, 0f),
        body = args.getFloat(EXTRA_FX_BODY, 0f),
        space = args.getFloat(EXTRA_FX_SPACE, 0f),
        glue = args.getFloat(EXTRA_FX_GLUE, 0f),
        loudness = args.getFloat(EXTRA_FX_LOUDNESS, 0f),
    ).normalized()

    fun startScene(sceneId: String, totalDurationMinutes: Int, extraSourceIds: Collection<String> = emptyList()): SessionCommand =
        SessionCommand(START_SCENE, Bundle().apply {
            putString(EXTRA_SCENE_ID, sceneId)
            putInt(EXTRA_ARC_MINUTES, totalDurationMinutes)
            putStringArrayList(EXTRA_SCENE_SOURCES, ArrayList(extraSourceIds.take(6)))
        })

    val stopScene: SessionCommand = SessionCommand(STOP_SCENE, Bundle())

    fun setSceneMacro(key: String, value: Float): SessionCommand =
        SessionCommand(SET_SCENE_MACRO, Bundle().apply {
            putString(EXTRA_MACRO_KEY, key)
            putFloat(EXTRA_MACRO_VALUE, value)
        })

    fun setSceneDuration(minutes: Int): SessionCommand =
        SessionCommand(SET_SCENE_ARC, Bundle().apply { putInt(EXTRA_ARC_MINUTES, minutes) })

    fun seekScene(elapsedMs: Long): SessionCommand =
        SessionCommand(SEEK_SCENE, Bundle().apply { putLong(EXTRA_ELAPSED_MS, elapsedMs.coerceAtLeast(0L)) })

    fun stepScenePhase(direction: Int): SessionCommand =
        SessionCommand(STEP_SCENE_PHASE, Bundle().apply { putInt(EXTRA_DIRECTION, if (direction < 0) -1 else 1) })

    fun setSceneRandomEvents(enabled: Boolean): SessionCommand =
        SessionCommand(SET_SCENE_RANDOM_EVENTS, Bundle().apply { putBoolean(EXTRA_ENABLED, enabled) })

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
        SessionCommand(SET_FX, Bundle()),
        SessionCommand(START_SCENE, Bundle()),
        stopScene,
        SessionCommand(SET_SCENE_MACRO, Bundle()),
        SessionCommand(SET_SCENE_ARC, Bundle()),
        SessionCommand(SEEK_SCENE, Bundle()),
        SessionCommand(STEP_SCENE_PHASE, Bundle()),
        SessionCommand(SET_SCENE_RANDOM_EVENTS, Bundle()),
    )

    fun snapshotBundle(
        snapshot: EngineSnapshot,
        sceneSnapshot: SceneRuntimeSnapshot = SceneRuntimeSnapshot(),
    ): Bundle = Bundle().apply {
        putString(EXTRA_SNAPSHOT, json.encodeToString(EngineSnapshot.serializer(), snapshot))
        putString(EXTRA_SCENE_SNAPSHOT, json.encodeToString(SceneRuntimeSnapshot.serializer(), sceneSnapshot))
    }

    fun parseSnapshot(extras: Bundle): EngineSnapshot? {
        val raw = extras.getString(EXTRA_SNAPSHOT) ?: return null
        return runCatching { json.decodeFromString(EngineSnapshot.serializer(), raw) }.getOrNull()
    }

    fun parseSceneSnapshot(extras: Bundle): SceneRuntimeSnapshot {
        val raw = extras.getString(EXTRA_SCENE_SNAPSHOT) ?: return SceneRuntimeSnapshot()
        return runCatching { json.decodeFromString(SceneRuntimeSnapshot.serializer(), raw) }
            .getOrDefault(SceneRuntimeSnapshot())
    }
}
