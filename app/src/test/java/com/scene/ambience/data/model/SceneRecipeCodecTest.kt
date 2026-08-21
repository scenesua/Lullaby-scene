package com.scene.ambience.data.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SceneRecipeCodecTest {
    @Test
    fun `recipe round trip keeps cross platform source ids and volumes`() {
        val recipe = SceneRecipeV1(
            name = "Rain Cabin",
            master = 0.72f,
            mix = mapOf("rain" to 0.55f, "aircraft_cabin" to 0.31f, "unknown" to 0.9f),
            fx = SceneRecipeFx(warmth = 30, air = 45, room = 20, glue = 25),
        )

        val decoded = SceneRecipeCodec.decode(SceneRecipeCodec.encode(recipe))
        assertNotNull(decoded)
        decoded!!
        assertEquals("Rain Cabin", decoded.name)
        assertEquals(0.72f, decoded.master, 0.0001f)
        assertEquals(0.55f, decoded.mix["rain"] ?: 0f, 0.0001f)
        assertEquals(0.31f, decoded.mix["aircraft_cabin"] ?: 0f, 0.0001f)
        assertTrue("unknown" !in decoded.mix)
    }

    @Test
    fun `share url can be decoded by android`() {
        val url = SceneRecipeCodec.toShareUrl(
            SceneRecipeV1(mix = mapOf("cafe" to 0.4f, "rain" to 0.2f))
        )
        val decoded = SceneRecipeCodec.fromUrl(url)
        assertNotNull(decoded)
        assertEquals(0.4f, decoded!!.mix["cafe"] ?: 0f, 0.0001f)
        assertEquals(0.2f, decoded.mix["rain"] ?: 0f, 0.0001f)
    }

    @Test
    fun `recipe converts to complete android mix with absent sources off`() {
        val mix = SceneRecipeCodec.toMixState(SceneRecipeV1(mix = mapOf("wind" to 0.25f)))
        assertEquals(0.25f, mix.sources.getValue("wind").volume, 0.0001f)
        assertTrue(mix.sources.getValue("wind").enabled)
        assertEquals(0f, mix.sources.getValue("rain").volume, 0.0001f)
        assertTrue(!mix.sources.getValue("rain").enabled)
    }
}
