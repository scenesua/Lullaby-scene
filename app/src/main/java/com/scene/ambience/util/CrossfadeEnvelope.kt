package com.scene.ambience.util

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Equal-power crossfade envelope (section 21):
 *   outgoing = cos(t * PI / 2)
 *   incoming = sin(t * PI / 2)
 * The squares always sum to 1, so perceived loudness stays constant.
 */
object CrossfadeEnvelope {

    /** t in 0..1 -> (outgoingGain, incomingGain). */
    fun gains(t: Float): Pair<Float, Float> {
        val tt = t.coerceIn(0f, 1f)
        val angle = (tt * PI / 2.0).toFloat()
        return cos(angle) to sin(angle)
    }

    fun outgoingGain(t: Float): Float = gains(t).first

    fun incomingGain(t: Float): Float = gains(t).second

    /** Sum of squares of both gains - always 1 within float precision. */
    fun powerSum(t: Float): Float {
        val (o, i) = gains(t)
        return o * o + i * i
    }
}
