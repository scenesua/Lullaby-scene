package com.scene.ambience.presentation

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scene.ambience.AmbienceApplication
import com.scene.ambience.controller.AmbienceControllerRepository
import com.scene.ambience.data.BuiltInPresets
import com.scene.ambience.data.PresetRepository
import com.scene.ambience.data.SettingsRepository
import com.scene.ambience.data.SoundLibraryRepository
import com.scene.ambience.data.model.AmbiencePreset
import com.scene.ambience.data.model.EngineSnapshot
import com.scene.ambience.data.model.EqSettings
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.SceneRuntimeSnapshot
import com.scene.ambience.data.model.SoundLibraryState
import com.scene.ambience.data.model.ThemeMode
import com.scene.ambience.media.SceneOrchestrator
import com.scene.ambience.update.UpdateCoordinator
import com.scene.ambience.update.UpdateUiState
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

data class AmbienceUiState(
    val library: SoundLibraryState = SoundLibraryState(),
    val snapshot: EngineSnapshot? = null,
    val scene: SceneRuntimeSnapshot = SceneRuntimeSnapshot(),
    val update: UpdateUiState = UpdateUiState(),
    val connected: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val focusPolicy: FocusPolicy = FocusPolicy.PAUSE,
    val timerDefaultMinutes: Int = 30,
    val timerFadeSeconds: Int = 60,
    val restoreLastMix: Boolean = true,
    val expandedCategories: Set<String> = emptySet(),
    val notificationPermissionAsked: Boolean = false,
    val userPresets: List<AmbiencePreset> = emptyList(),
    val eqSettings: EqSettings = EqSettings(),
) {
    val builtInPresets: List<AmbiencePreset> = BuiltInPresets.createAll()
    val allPresets: List<AmbiencePreset> get() = builtInPresets + userPresets
}

sealed interface AmbienceUiEvent {
    data class ShowMessage(val message: String) : AmbienceUiEvent
    object RequestNotificationPermission : AmbienceUiEvent
}

private data class CoreUiState(
    val library: SoundLibraryState,
    val snapshot: EngineSnapshot?,
    val connected: Boolean,
    val settings: com.scene.ambience.data.model.AppSettings,
    val scene: SceneRuntimeSnapshot,
)

class AmbienceViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as AmbienceApplication
    private val json = Json { ignoreUnknownKeys = true }

    val libraryRepository: SoundLibraryRepository = app.libraryRepository
    val settingsRepository: SettingsRepository = app.settingsRepository
    private val presetRepository: PresetRepository = app.presetRepository
    private val controllerRepository = AmbienceControllerRepository(app, viewModelScope)
    private val updateCoordinator = UpdateCoordinator(app)

    private val _events = MutableSharedFlow<AmbienceUiEvent>(extraBufferCapacity = 8)
    val events: SharedFlow<AmbienceUiEvent> = _events.asSharedFlow()

    private val coreState = combine(
        libraryRepository.state,
        controllerRepository.snapshot,
        controllerRepository.connected,
        settingsRepository.settings,
        controllerRepository.sceneSnapshot,
    ) { library, snapshot, connected, settings, scene ->
        CoreUiState(library, snapshot, connected, settings, scene)
    }

    val uiState: StateFlow<AmbienceUiState> = combine(coreState, updateCoordinator.state) { core, update ->
        val settings = core.settings
        AmbienceUiState(
            library = core.library,
            snapshot = core.snapshot,
            scene = core.scene,
            update = update,
            connected = core.connected,
            themeMode = settings.themeMode,
            focusPolicy = settings.focusPolicy,
            timerDefaultMinutes = settings.timerDefaultMinutes,
            timerFadeSeconds = settings.timerFadeSeconds,
            restoreLastMix = settings.restoreLastMix,
            expandedCategories = settings.expandedCategories,
            notificationPermissionAsked = settings.notificationPermissionAsked,
            userPresets = settings.userPresets,
            eqSettings = settings.eqSettings,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, AmbienceUiState())

    init {
        controllerRepository.connect()
        viewModelScope.launch {
            controllerRepository.snapshot
                .drop(1)
                .debounce(1200L)
                .collect { snapshot ->
                    if (snapshot != null && (snapshot.sources.isNotEmpty() || snapshot.masterVolume != 0.8f || snapshot.masterMuted)) {
                        settingsRepository.saveLastMix(
                            MixState(
                                masterVolume = snapshot.masterVolume,
                                masterMuted = snapshot.masterMuted,
                                sources = snapshot.sources,
                            ),
                            snapshot.activePresetId,
                        )
                    }
                }
        }
    }

    fun togglePlayPause() {
        val snapshot = uiState.value.snapshot
        if (snapshot?.activeSourceCount == 0) {
            _events.tryEmit(AmbienceUiEvent.ShowMessage("no_active_sources"))
            return
        }
        if (snapshot?.playbackState == com.scene.ambience.data.model.PlaybackState.PLAYING) {
            controllerRepository.pause()
        } else {
            controllerRepository.play()
        }
    }

    fun stop() = controllerRepository.stop()

    fun startPassengerAircraftScene(arcMinutes: Int) {
        if (uiState.value.library.manifestFor(SceneOrchestrator.SOURCE_AIRCRAFT) == null) {
            _events.tryEmit(AmbienceUiEvent.ShowMessage("scene_aircraft_unavailable"))
            return
        }
        controllerRepository.startScene(SceneOrchestrator.PASSENGER_AIRCRAFT, arcMinutes)
    }

    fun stopScene() = controllerRepository.stopScene()
    fun setSceneArc(minutes: Int) = controllerRepository.setSceneArc(minutes)
    fun setSceneMacro(key: String, value: Float) = controllerRepository.setSceneMacro(key, value)

    fun setMasterVolume(volume: Float) = controllerRepository.setMasterVolume(volume)
    fun setMasterMuted(muted: Boolean) = controllerRepository.setMasterMuted(muted)

    fun setSourceVolume(id: String, volume: Float) {
        Log.d("AmbiencePlayback", "ViewModelVolume source=$id value=$volume")
        controllerRepository.setSourceVolume(id, volume)
    }

    fun setSourceMuted(id: String, muted: Boolean) = controllerRepository.setSourceMuted(id, muted)

    fun toggleSourceEnabled(id: String) {
        val source = uiState.value.snapshot?.sources?.get(id)
        val enabled = source?.enabled ?: false
        if (enabled) {
            setSourceMuted(id, true)
        } else {
            setSourceMuted(id, false)
            val volume = source?.volume?.takeIf { it > 0f } ?: 0.5f
            setSourceVolume(id, volume)
        }
    }

    fun disableAllSources() = controllerRepository.disableAllSources()

    fun applyPreset(preset: AmbiencePreset) {
        if (uiState.value.scene.active) controllerRepository.stopScene()
        val mixJson = json.encodeToString(MixState.serializer(), preset.mix)
        controllerRepository.applyMix(mixJson, preset.id)
        val snapshot = uiState.value.snapshot
        if (snapshot?.playbackState != com.scene.ambience.data.model.PlaybackState.PLAYING) {
            controllerRepository.play()
        }
    }

    fun saveCurrentMixAsPreset(name: String) {
        val snapshot = uiState.value.snapshot ?: run {
            _events.tryEmit(AmbienceUiEvent.ShowMessage("no_engine_snapshot"))
            return
        }
        viewModelScope.launch {
            val preset = presetRepository.savePreset(
                name = name,
                mix = MixState(snapshot.masterVolume, snapshot.masterMuted, snapshot.sources),
                current = uiState.value.userPresets,
            )
            _events.tryEmit(AmbienceUiEvent.ShowMessage("preset_saved:${preset.id}"))
        }
    }

    fun renamePreset(id: String, newName: String) {
        viewModelScope.launch { presetRepository.renamePreset(id, newName, uiState.value.userPresets) }
    }

    fun deletePreset(id: String) {
        viewModelScope.launch { presetRepository.deletePreset(id, uiState.value.userPresets) }
    }

    fun startSleepTimer(durationMs: Long) {
        val fadeMs = uiState.value.timerFadeSeconds * 1000L
        controllerRepository.startSleepTimer(durationMs, fadeMs)
        viewModelScope.launch { settingsRepository.saveSleepTimer(System.currentTimeMillis() + durationMs, fadeMs) }
    }

    fun cancelSleepTimer() {
        controllerRepository.cancelSleepTimer()
        viewModelScope.launch { settingsRepository.clearSleepTimer() }
    }

    fun setThemeMode(mode: ThemeMode) { viewModelScope.launch { settingsRepository.setThemeMode(mode) } }
    fun setFocusPolicy(policy: FocusPolicy) { viewModelScope.launch { settingsRepository.setFocusPolicy(policy) } }
    fun setTimerDefaults(minutes: Int, fadeSeconds: Int) { viewModelScope.launch { settingsRepository.setTimerDefaults(minutes, fadeSeconds) } }
    fun setRestoreLastMix(enabled: Boolean) { viewModelScope.launch { settingsRepository.setRestoreLastMix(enabled) } }

    fun setEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) {
        controllerRepository.setEqualizer(enabled, presetName, bands)
        viewModelScope.launch {
            settingsRepository.setEqSettings(EqSettings(enabled = enabled, presetName = presetName, bands = bands))
        }
    }

    fun toggleCategoryExpanded(categoryId: String) {
        val current = uiState.value.expandedCategories
        val next = if (categoryId in current) current - categoryId else current + categoryId
        viewModelScope.launch { settingsRepository.setExpandedCategories(next) }
    }

    fun markNotificationPermissionAsked(asked: Boolean) {
        viewModelScope.launch { settingsRepository.setNotificationPermissionAsked(asked) }
    }

    fun onPlayRequested() {
        val state = uiState.value
        if (state.snapshot?.activeSourceCount == 0) {
            _events.tryEmit(AmbienceUiEvent.ShowMessage("no_active_sources"))
            return
        }
        if (!state.notificationPermissionAsked) {
            markNotificationPermissionAsked(true)
            _events.tryEmit(AmbienceUiEvent.RequestNotificationPermission)
        }
        controllerRepository.play()
    }

    fun checkForUpdates(manual: Boolean = false) {
        viewModelScope.launch { updateCoordinator.check(manual) }
    }

    fun downloadUpdate() { viewModelScope.launch { updateCoordinator.downloadAvailable() } }
    fun dismissUpdatePrompt() = updateCoordinator.dismissPrompt()
    fun suppressUpdateFor24Hours() = updateCoordinator.suppressFor24Hours()
    fun consumeInstallUri() = updateCoordinator.consumeInstallUri()
    fun clearUpdateMessage() = updateCoordinator.clearMessage()

    fun clearMessage() = controllerRepository.clearMessage()
}
