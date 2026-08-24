package com.scene.ambience.media

import android.app.PendingIntent
import android.content.Intent
import android.os.Bundle
import androidx.media3.common.Player
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSession.ConnectionResult
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommands
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.scene.ambience.AmbienceApplication
import com.scene.ambience.MainActivity
import com.scene.ambience.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/** Foreground playback service owning both the low-level mixer and living-scene runtime. */
class AmbiencePlaybackService : MediaSessionService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var engine: AmbienceEngine
    private lateinit var sceneOrchestrator: SceneOrchestrator
    private lateinit var sessionPlayer: AmbienceSessionPlayer
    private lateinit var session: MediaSession
    private lateinit var notificationController: NotificationController
    private lateinit var application: AmbienceApplication

    override fun onCreate() {
        super.onCreate()
        application = super.getApplication() as AmbienceApplication
        val library = application.libraryRepository.requireLibrary()
        engine = AmbienceEngine(
            context = this,
            library = library,
            scope = serviceScope,
            focusPolicyProvider = { application.settingsRepository.settingsFlow.value.focusPolicy },
            eqSettingsProvider = { application.settingsRepository.settingsFlow.value.eqSettings },
            fxSettingsProvider = { application.settingsRepository.settingsFlow.value.fxSettings },
            onStopRequested = { stopSelf() },
        )
        sceneOrchestrator = SceneOrchestrator(
            engine = engine,
            scope = serviceScope,
            eqSettingsProvider = { application.settingsRepository.settingsFlow.value.eqSettings },
            isSourceAvailable = { id -> library.manifestFor(id) != null },
        )

        sessionPlayer = AmbienceSessionPlayer(engine)
        session = MediaSession.Builder(this, sessionPlayer)
            .setSessionActivity(launcherPendingIntent())
            .setCallback(ServiceCallback())
            .setSessionExtras(Commands.snapshotBundle(engine.snapshot(), sceneOrchestrator.state.value))
            .build()
        addSession(session)
        notificationController = NotificationController(
            context = this,
            presetNameProvider = { id -> presetDisplayName(id) },
        )
        setMediaNotificationProvider(notificationController)

        serviceScope.launch {
            combine(engine.state, sceneOrchestrator.state) { engineSnapshot, sceneSnapshot ->
                engineSnapshot to sceneSnapshot
            }
                .distinctUntilChanged()
                .map { (engineSnapshot, sceneSnapshot) ->
                    Commands.snapshotBundle(engineSnapshot, sceneSnapshot)
                }
                // JSON encoding is pure CPU work; keep it off the service/UI looper.
                .flowOn(Dispatchers.Default)
                // If the scene clock advances while encoding, only deliver the newest bundle.
                .conflate()
                .collect { extras -> session.setSessionExtras(extras) }
        }

        restoreState()
    }

    private fun restoreState() {
        val settings = application.settingsRepository.settingsFlow.value
        engine.applyFx(settings.fxSettings)
        engine.applyEqualizer(settings.eqSettings.enabled, settings.eqSettings.presetName, settings.eqSettings.bands)
        val mix = settings.lastMix ?: return
        engine.applyMix(mix, settings.lastPresetId)
        val timerEnd = settings.sleepTimerEndEpochMs
        val timerFade = settings.sleepTimerFadeMs
        if (timerEnd != null && timerFade != null && timerEnd > System.currentTimeMillis()) {
            engine.restoreSleepTimer(timerEnd, timerFade)
        }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        stopSelf()
    }

    override fun onDestroy() {
        sceneOrchestrator.release()
        engine.release()
        sessionPlayer.release()
        session.release()
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun launcherPendingIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun presetDisplayName(presetId: String?): String {
        if (presetId == null) return getString(R.string.app_name)
        val user = application.settingsRepository.settingsFlow.value.userPresets
        user.firstOrNull { it.id == presetId }?.let { return it.name }
        return when (presetId) {
            "preset_rainy_cafe" -> getString(R.string.preset_rainy_cafe)
            "preset_forest_night" -> getString(R.string.preset_forest_night)
            "preset_beach" -> getString(R.string.preset_beach)
            "preset_cozy_fireplace" -> getString(R.string.preset_cozy_fireplace)
            "preset_train_journey" -> getString(R.string.preset_train_journey)
            "preset_city_night" -> getString(R.string.preset_city_night)
            "preset_thunderstorm" -> getString(R.string.preset_thunderstorm)
            "preset_forest_morning" -> getString(R.string.preset_forest_morning)
            "preset_bamboo_meditation" -> getString(R.string.preset_bamboo_meditation)
            "preset_deep_focus" -> getString(R.string.preset_deep_focus)
            "preset_quiet_night" -> getString(R.string.preset_quiet_night)
            "preset_morning_birds" -> getString(R.string.preset_morning_birds)
            "preset_ocean_waves" -> getString(R.string.preset_ocean_waves)
            "preset_rainy_night" -> getString(R.string.preset_rainy_night)
            "preset_fan_room" -> getString(R.string.preset_fan_room)
            "preset_cafe_focus" -> getString(R.string.preset_cafe_focus)
            "preset_simple_aircraft" -> getString(R.string.preset_simple_aircraft)
            "preset_simple_train" -> getString(R.string.preset_simple_train)
            "preset_simple_ferry" -> getString(R.string.preset_simple_ferry)
            "preset_simple_spacecraft" -> getString(R.string.preset_simple_spacecraft)
            "preset_simple_submarine" -> getString(R.string.preset_simple_submarine)
            "preset_winter_lighthouse" -> getString(R.string.preset_winter_lighthouse)
            "preset_harbor_cabin" -> getString(R.string.preset_harbor_cabin)
            "preset_polar_night_train" -> getString(R.string.preset_polar_night_train)
            else -> getString(R.string.app_name)
        }
    }

    private fun handleCustomCommand(action: String, args: Bundle): SessionResult {
        when (action) {
            Commands.SET_MASTER_VOLUME -> engine.setMasterVolume(args.getFloat(Commands.EXTRA_VOLUME, 0f))
            Commands.SET_MASTER_MUTED -> engine.setMasterMuted(args.getBoolean(Commands.EXTRA_MUTED))
            Commands.SET_SOURCE_VOLUME -> {
                val id = args.getString(Commands.EXTRA_SOURCE_ID) ?: return SessionResult(SessionResult.RESULT_ERROR_BAD_VALUE)
                engine.setSourceVolume(id, args.getFloat(Commands.EXTRA_VOLUME, 0f))
            }
            Commands.SET_SOURCE_MUTED -> {
                val id = args.getString(Commands.EXTRA_SOURCE_ID) ?: return SessionResult(SessionResult.RESULT_ERROR_BAD_VALUE)
                engine.setSourceMuted(id, args.getBoolean(Commands.EXTRA_MUTED))
            }
            Commands.APPLY_MIX -> {
                val raw = args.getString(Commands.EXTRA_MIX_JSON)
                val mix = if (raw != null) com.scene.ambience.data.model.MixState.fromJson(raw) else null
                if (mix != null) engine.applyMix(mix, args.getString(Commands.EXTRA_PRESET_ID))
            }
            Commands.DISABLE_ALL_SOURCES -> engine.disableAllSources()
            Commands.START_SLEEP_TIMER -> engine.startSleepTimer(
                args.getLong(Commands.EXTRA_DURATION_MS, 30L * 60L * 1000L),
                args.getLong(Commands.EXTRA_FADE_MS, 60L * 1000L),
            )
            Commands.CANCEL_SLEEP_TIMER -> engine.cancelSleepTimer()
            Commands.CLEAR_MESSAGE -> engine.clearMessage()
            Commands.SET_EQ -> engine.applyEqualizer(
                args.getBoolean(Commands.EXTRA_EQ_ENABLED),
                args.getString(Commands.EXTRA_EQ_PRESET) ?: "",
                args.getIntegerArrayList(Commands.EXTRA_EQ_BANDS) ?: emptyList(),
            )
            Commands.SET_FX -> engine.applyFx(Commands.fxFrom(args))
            Commands.START_SCENE -> {
                val id = args.getString(Commands.EXTRA_SCENE_ID) ?: return SessionResult(SessionResult.RESULT_ERROR_BAD_VALUE)
                val started = sceneOrchestrator.start(id, args.getInt(Commands.EXTRA_ARC_MINUTES, 480))
                if (!started) return SessionResult(SessionResult.RESULT_ERROR_BAD_VALUE)
            }
            Commands.STOP_SCENE -> sceneOrchestrator.stopScene()
            Commands.SET_SCENE_MACRO -> {
                val key = args.getString(Commands.EXTRA_MACRO_KEY) ?: return SessionResult(SessionResult.RESULT_ERROR_BAD_VALUE)
                sceneOrchestrator.setMacro(key, args.getFloat(Commands.EXTRA_MACRO_VALUE, 0.5f))
            }
            Commands.SET_SCENE_ARC -> sceneOrchestrator.setDurationMinutes(args.getInt(Commands.EXTRA_ARC_MINUTES, 480))
            Commands.SEEK_SCENE -> sceneOrchestrator.seekToElapsedMs(args.getLong(Commands.EXTRA_ELAPSED_MS, 0L))
            Commands.STEP_SCENE_PHASE -> sceneOrchestrator.stepPhase(args.getInt(Commands.EXTRA_DIRECTION, 1))
            else -> return SessionResult(SessionResult.RESULT_ERROR_UNKNOWN)
        }
        return SessionResult(SessionResult.RESULT_SUCCESS)
    }

    private inner class ServiceCallback : MediaSession.Callback {
        override fun onConnect(session: MediaSession, controller: MediaSession.ControllerInfo): ConnectionResult {
            val sessionCommands = SessionCommands.Builder()
                .addSessionCommands(Commands.sessionCommands)
                .build()
            val playerCommands = Player.Commands.Builder()
                .add(Player.COMMAND_PLAY_PAUSE)
                .add(Player.COMMAND_PREPARE)
                .add(Player.COMMAND_STOP)
                .add(Player.COMMAND_GET_CURRENT_MEDIA_ITEM)
                .add(Player.COMMAND_GET_TIMELINE)
                .add(Player.COMMAND_GET_VOLUME)
                .build()
            return ConnectionResult.accept(sessionCommands, playerCommands)
        }

        override fun onCustomCommand(
            session: MediaSession,
            controller: MediaSession.ControllerInfo,
            customAction: androidx.media3.session.SessionCommand,
            args: Bundle,
        ): ListenableFuture<SessionResult> =
            Futures.immediateFuture(handleCustomCommand(customAction.customAction, customAction.customExtras ?: args))
    }
}
