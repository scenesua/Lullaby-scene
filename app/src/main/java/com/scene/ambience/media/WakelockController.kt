package com.scene.ambience.media

import android.content.Context
import android.os.PowerManager

/** Keeps the process alive while audio is playing, without keeping the screen on. */
class WakelockController(context: Context) {

    private val powerManager =
        context.getSystemService(Context.POWER_SERVICE) as PowerManager

    private val wakelock: PowerManager.WakeLock? =
        powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ambience:audio").also {
            it.setReferenceCounted(false)
        }

    private var held = false

    fun acquire() {
        if (held) return
        runCatching { wakelock?.acquire() }
        held = true
    }

    fun release() {
        if (!held) return
        runCatching { if (wakelock?.isHeld == true) wakelock.release() }
        held = false
    }
}
