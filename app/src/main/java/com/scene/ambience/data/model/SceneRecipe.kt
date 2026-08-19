package com.scene.ambience.data.model

import android.net.Uri
import android.util.Base64
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val SCENE_RECIPE_SCHEMA = "lullaby.scene.recipe"
private const val SCENE_RECIPE_VERSION = 1
private const val SCENE_RECIPE_BASE_URL = "https://lullabyscene.com/player/"

@Serializable
data class SceneRecipeFx(
    val warmth: Int? = null,
    val air: Int? = null,
    val room: Int? = null,
    val body: Int? = null,
    val glue: Int? = null,
    val loudness: Int? = null,
)

@Serializable
data class SceneRecipeV1(
    val schema: String = SCENE_RECIPE_SCHEMA,
    val version: Int = SCENE_RECIPE_VERSION,
    val name: String = "Shared Scene",
    val master: Float = 0.7f,
    val mix: Map<String, Float> = emptyMap(),
    val fx: SceneRecipeFx? = null,
    val seed: Long? = null,
)

object SceneRecipeCodec {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun fromSnapshot(
        snapshot: EngineSnapshot,
        fxSettings: FxSettings,
        name: String = "Shared Scene",
    ): SceneRecipeV1 {
        val mix = snapshot.sources.values
            .asSequence()
            .filter { it.enabled && !it.muted && it.volume > 0f && SourceId.fromId(it.id) != null }
            .associate { it.id to it.volume.coerceIn(0f, 1f) }
        return SceneRecipeV1(
            name = name.trim().take(80).ifBlank { "Shared Scene" },
            master = snapshot.masterVolume.coerceIn(0f, 1f),
            mix = mix,
            fx = SceneRecipeFx(
                warmth = (fxSettings.warmth.coerceIn(0f, 1f) * 100).toInt(),
                air = (fxSettings.air.coerceIn(0f, 1f) * 100).toInt(),
                body = (fxSettings.body.coerceIn(0f, 1f) * 100).toInt(),
                glue = (fxSettings.glue.coerceIn(0f, 1f) * 100).toInt(),
                loudness = (fxSettings.loudness.coerceIn(0f, 1f) * 100).toInt(),
            ),
        )
    }

    fun toMixState(recipe: SceneRecipeV1): MixState {
        val valid = recipe.mix
            .filterKeys { SourceId.fromId(it) != null }
            .mapValues { (_, value) -> value.coerceIn(0f, 1f) }
        val states = SourceCatalog.all.associate { definition ->
            val id = definition.sourceId.id
            val volume = valid[id] ?: 0f
            id to SourceState(
                id = id,
                enabled = volume > 0f,
                volume = volume,
                muted = volume <= 0f,
            )
        }
        return MixState(
            masterVolume = recipe.master.coerceIn(0f, 1f),
            masterMuted = false,
            sources = states,
        )
    }

    fun toFxSettings(recipe: SceneRecipeV1, current: FxSettings = FxSettings()): FxSettings {
        val fx = recipe.fx ?: return current
        fun normalized(value: Int?, fallback: Float): Float =
            value?.coerceIn(0, 100)?.div(100f) ?: fallback
        return current.copy(
            enabled = true,
            warmth = normalized(fx.warmth, current.warmth),
            air = normalized(fx.air, current.air),
            body = normalized(fx.body, current.body),
            glue = normalized(fx.glue, current.glue),
            loudness = normalized(fx.loudness, current.loudness),
        ).normalized()
    }

    fun encode(recipe: SceneRecipeV1): String {
        require(recipe.schema == SCENE_RECIPE_SCHEMA && recipe.version == SCENE_RECIPE_VERSION)
        val raw = json.encodeToString(SceneRecipeV1.serializer(), sanitize(recipe))
        return Base64.encodeToString(raw.toByteArray(Charsets.UTF_8), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    fun decode(encoded: String): SceneRecipeV1? = runCatching {
        val raw = String(
            Base64.decode(encoded, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING),
            Charsets.UTF_8,
        )
        val recipe = json.decodeFromString(SceneRecipeV1.serializer(), raw)
        require(recipe.schema == SCENE_RECIPE_SCHEMA && recipe.version == SCENE_RECIPE_VERSION)
        sanitize(recipe)
    }.getOrNull()

    fun toShareUrl(recipe: SceneRecipeV1): String = Uri.parse(SCENE_RECIPE_BASE_URL)
        .buildUpon()
        .appendQueryParameter("scene", "simple")
        .appendQueryParameter("recipe", encode(recipe))
        .build()
        .toString()

    fun fromUrl(url: String?): SceneRecipeV1? {
        if (url.isNullOrBlank()) return null
        val encoded = runCatching { Uri.parse(url).getQueryParameter("recipe") }.getOrNull() ?: return null
        return decode(encoded)
    }

    private fun sanitize(recipe: SceneRecipeV1): SceneRecipeV1 = recipe.copy(
        name = recipe.name.trim().take(80).ifBlank { "Shared Scene" },
        master = recipe.master.coerceIn(0f, 1f),
        mix = recipe.mix
            .filterKeys { SourceId.fromId(it) != null }
            .mapValues { (_, value) -> value.coerceIn(0f, 1f) }
            .filterValues { it > 0f },
        fx = recipe.fx?.copy(
            warmth = recipe.fx.warmth?.coerceIn(0, 100),
            air = recipe.fx.air?.coerceIn(0, 100),
            room = recipe.fx.room?.coerceIn(0, 100),
            body = recipe.fx.body?.coerceIn(0, 100),
            glue = recipe.fx.glue?.coerceIn(0, 100),
            loudness = recipe.fx.loudness?.coerceIn(0, 100),
        ),
    )
}
