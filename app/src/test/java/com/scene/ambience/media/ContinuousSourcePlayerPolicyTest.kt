package com.scene.ambience.media

import com.scene.ambience.data.model.AudioAssetManifest
import org.junit.Assert.assertEquals
import org.junit.Test

class ContinuousSourcePlayerPolicyTest {

    private fun asset(crossfadeMs: Long = 0L) = AudioAssetManifest(
        assetId = "loop",
        path = "loop.ogg",
        durationMs = 60_000L,
        crossfadeMs = crossfadeMs,
    )

    @Test
    fun explicitCrossfadeUsesTwoPlayersEvenForSeamlessSingleFile() {
        assertEquals(2, continuousPlayerCount(listOf(asset(8_000L)), "seamless"))
        assertEquals(2, continuousPlayerCount(listOf(asset()), "crossfade"))
    }

    @Test
    fun trulySeamlessSingleFileKeepsOnePlayer() {
        assertEquals(1, continuousPlayerCount(listOf(asset()), "seamless"))
    }
}
