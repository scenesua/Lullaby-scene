package com.scene.ambience.data.model

import kotlinx.serialization.Serializable

enum class PlaybackState { IDLE, READY, PLAYING, PAUSED, STOPPED }

@Serializable
data class SourceState(
    val id: String,
    val enabled: Boolean = false,
    val volume: Float = 0f,
    val muted: Boolean = false,
) {
    val audible: Boolean get() = enabled && !muted && volume > 0f
}

@Serializable
data class MixState(
    val masterVolume: Float = 0.8f,
    val masterMuted: Boolean = false,
    val sources: Map<String, SourceState> = emptyMap(),
) {
    companion object {
        fun fromJson(json: String): MixState? =
            runCatching { kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
                .decodeFromString(MixState.serializer(), json) }.getOrNull()
    }
}

/** Snapshot pushed from the playback service to UI clients through session extras. */
@Serializable
data class EngineSnapshot(
    val playbackState: PlaybackState = PlaybackState.IDLE,
    val masterVolume: Float = 0.8f,
    val masterMuted: Boolean = false,
    val sources: Map<String, SourceState> = emptyMap(),
    val sleepTimerRemainingMs: Long? = null,
    val sleepFading: Boolean = false,
    val activePresetId: String? = null,
    val message: String? = null,
) {
    val activeSourceCount: Int get() = sources.values.count { it.enabled }
}
