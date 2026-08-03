package com.scene.ambience.media

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager

/** Pauses playback when the audio route becomes noisy (e.g. headphones unplugged). */
class BecomingNoisyReceiver(private val context: Context) {

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
                onNoisy()
            }
        }
    }

    private var onNoisy: () -> Unit = {}

    fun register(listener: () -> Unit) {
        onNoisy = listener
        context.registerReceiver(receiver, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY))
    }

    fun unregister() {
        runCatching { context.unregisterReceiver(receiver) }
    }
}
