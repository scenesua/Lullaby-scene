package com.scene.ambience.media

import android.app.Notification
import android.content.Context
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.graphics.drawable.IconCompat
import androidx.media3.common.Player
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaNotification
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaStyleNotificationHelper
import com.google.common.collect.ImmutableList
import com.scene.ambience.R
import com.scene.ambience.data.model.PlaybackState

/**
 * Media notification reflecting the engine snapshot: title from the active
 * preset, text with playing state and sleep-timer countdown, and custom
 * actions (mute/unmute, play/pause, stop). Without POST_NOTIFICATIONS
 * permission the notification is silently skipped (spec: quiet fallback).
 */
class NotificationController(
    private val context: Context,
    private val presetNameProvider: (String?) -> String,
) : MediaNotification.Provider {

    companion object {
        const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "ambience_playback"
    }

    private val notificationManager = NotificationManagerCompat.from(context)

    init {
        runCatching {
            val channel = android.app.NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.notification_channel_name),
                android.app.NotificationManager.IMPORTANCE_LOW,
            )
            context.getSystemService(android.app.NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    override fun getNotificationChannelInfo(): MediaNotification.Provider.NotificationChannelInfo =
        MediaNotification.Provider.NotificationChannelInfo(CHANNEL_ID, context.getString(R.string.notification_channel_name))

    override fun createNotification(
        mediaSession: MediaSession,
        layout: ImmutableList<CommandButton>,
        actionFactory: MediaNotification.ActionFactory,
        callback: MediaNotification.Provider.Callback,
    ): MediaNotification {
        val snapshot = Commands.parseSnapshot(mediaSession.sessionExtras)
        val playing = snapshot?.playbackState == PlaybackState.PLAYING

        val title = presetNameProvider(snapshot?.activePresetId)
        val text = buildString {
            if (playing) {
                append(context.getString(R.string.notification_playing))
                val active = snapshot?.activeSourceCount ?: 0
                if (active > 0) append(" · ").append(active)
            } else {
                append(context.getString(R.string.notification_paused))
            }
            val remaining = snapshot?.sleepTimerRemainingMs
            if (remaining != null && remaining > 0L) {
                append(" · ").append(context.getString(R.string.notification_sleep_in, formatCountdown(remaining)))
            }
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_ambience)
            .setContentTitle(title)
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .setContentIntent(mediaSession.sessionActivity)
            .setStyle(
                MediaStyleNotificationHelper.MediaStyle(mediaSession)
                    .setShowActionsInCompactView(0, 1, 2)
                    .setShowCancelButton(true)
                    .setCancelButtonIntent(actionFactory.createNotificationDismissalIntent(mediaSession))
            )

        val actions = buildActions(mediaSession, actionFactory, snapshot, playing)
        actions.forEach { builder.addAction(it) }

        val notification = builder.build()
        val mediaNotification = MediaNotification(NOTIFICATION_ID, notification)
        // Quiet fallback: never crash or log when notifications are denied.
        runCatching {
            if (notificationManager.areNotificationsEnabled()) {
                notificationManager.notify(NOTIFICATION_ID, notification)
            }
        }
        callback.onNotificationChanged(mediaNotification)
        return mediaNotification
    }

    private fun buildActions(
        session: MediaSession,
        actionFactory: MediaNotification.ActionFactory,
        snapshot: com.scene.ambience.data.model.EngineSnapshot?,
        playing: Boolean,
    ): List<NotificationCompat.Action> {
        val masterMuted = snapshot?.masterMuted ?: false
        val muteAction = actionFactory.createCustomAction(
            session,
            IconCompat.createWithResource(context, if (masterMuted) R.drawable.ic_notif_unmute else R.drawable.ic_notif_mute),
            context.getString(if (masterMuted) R.string.action_unmute else R.string.action_mute),
            Commands.SET_MASTER_MUTED,
            Bundle().apply { putBoolean(Commands.EXTRA_MUTED, !masterMuted) },
        )
        val playPauseAction = actionFactory.createMediaAction(
            session,
            IconCompat.createWithResource(context, if (playing) R.drawable.ic_notif_pause else R.drawable.ic_notif_play),
            context.getString(if (playing) R.string.action_pause else R.string.action_play),
            Player.COMMAND_PLAY_PAUSE,
        )
        val stopAction = actionFactory.createMediaAction(
            session,
            IconCompat.createWithResource(context, R.drawable.ic_notif_stop),
            context.getString(R.string.action_stop),
            Player.COMMAND_STOP,
        )
        return listOf(muteAction, playPauseAction, stopAction)
    }

    override fun handleCustomCommand(session: MediaSession, action: String, extras: Bundle): Boolean = false

    private fun formatCountdown(ms: Long): String {
        val totalSeconds = (ms / 1000).coerceAtLeast(0L)
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        return if (hours > 0) {
            String.format("%d:%02d:%02d", hours, minutes, seconds)
        } else {
            String.format("%02d:%02d", minutes, seconds)
        }
    }
}
