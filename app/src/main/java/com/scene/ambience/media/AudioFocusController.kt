package com.scene.ambience.media

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager

/**
 * Wraps AudioManager audio-focus handling. LOSS_TRANSIENT is reported as
 * such; the engine decides pause/duck based on the configured policy.
 * Regain (GAIN) never auto-resumes per section 31.
 */
class AudioFocusController(
    private val context: Context,
    private val listener: (FocusEvent) -> Unit,
) {

    private val audioManager =
        context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private val focusRequest: AudioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
        )
        .setOnAudioFocusChangeListener { change ->
            when (change) {
                AudioManager.AUDIOFOCUS_GAIN -> listener(FocusEvent.GAIN)
                AudioManager.AUDIOFOCUS_LOSS -> listener(FocusEvent.LOSS)
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> listener(FocusEvent.LOSS_TRANSIENT)
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> listener(FocusEvent.DUCK)
            }
        }
        .setWillPauseWhenDucked(false)
        .build()

    private var hasFocus = false

    fun request(policy: com.scene.ambience.data.model.FocusPolicy) {
        if (hasFocus) return
        val stream = when (policy) {
            com.scene.ambience.data.model.FocusPolicy.PAUSE,
            com.scene.ambience.data.model.FocusPolicy.CONTINUE,
            -> AudioManager.STREAM_MUSIC
            com.scene.ambience.data.model.FocusPolicy.DUCK -> AudioManager.STREAM_MUSIC
        }
        val result = audioManager.requestAudioFocus(focusRequest)
        hasFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    fun abandon() {
        if (!hasFocus) return
        audioManager.abandonAudioFocusRequest(focusRequest)
        hasFocus = false
    }
}
