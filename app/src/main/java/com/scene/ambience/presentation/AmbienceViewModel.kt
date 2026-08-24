package com.scene.ambience.presentation

import android.app.Application
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
import com.scene.ambience.data.model.FxSettings
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.SceneRecipeCodec
import com.scene.ambience.data.model.SceneRecipeV1
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
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

private val BUILT_IN_PRESETS: List<AmbiencePreset> = BuiltInPresets.createAll()

data class AmbienceUiState(
    val library: SoundLibraryState = SoundLibraryState(),
    val snapshot: EngineSnapshot? = null,
    val update: UpdateUiState = UpdateUiState(),
    val connected: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val focusPolicy: FocusPolicy = FocusPolicy.PAUSE,
    val timerDefaultMinutes: Int = 30,
    val timerFadeSeconds: Int = 60,
    val restoreLastMix: Boolean = true,
    val includePrereleaseUpdates: Boolean = false,
    val expandedCategories: Set<String> = emptySet(),
    val notificationPermissionAsked: Boolean = false,
    val userPresets: List<AmbiencePreset> = emptyList(),
    val eqSettings: EqSettings = EqSettings(),
    val fxSettings: FxSettings = FxSettings(),
) {
    val builtInPresets: List<AmbiencePreset> = BUILT_IN_PRESETS
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
    val settings: com.scene.ambience.data.AppSettings,
)

private data class PersistedMixCandidate(
    val mix: MixState,
    val presetId: String?,
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

    /** High-frequency scene clock updates are consumed only by ScenesScreen. */
    val sceneState: StateFlow<SceneRuntimeSnapshot> = controllerRepository.sceneSnapshot

    /** Sleep countdown updates are consumed only by TimerScreen. */
    val timerRemaining: StateFlow<Long?> = controllerRepository.snapshot
        .map { it?.sleepTimerRemainingMs }
        .distinctUntilChanged()
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    /**
     * Remove timer-only fields from app-wide state so a countdown/fade cannot
     * recompose Mixer, Presets, FX, Settings and the navigation chrome every tick.
     */
    private val stableSnapshot: StateFlow<EngineSnapshot?> = controllerRepository.snapshot
        .map { snapshot ->
            snapshot?.copy(
                sleepTimerRemainingMs = null,
                sleepFading = false,
            )
        }
        .distinctUntilChanged()
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val coreState = combine(
        libraryRepository.state,
        stableSnapshot,
        controllerRepository.connected,
        settingsRepository.settings,
    ) { library, snapshot, connected, settings ->
        CoreUiState(library, snapshot, connected, settings)
    }

    val uiState: StateFlow<AmbienceUiState> = combine(coreState, updateCoordinator.state) { core, update ->
        val settings = core.settings
        AmbienceUiState(
            library = core.library,
            snapshot = core.snapshot,
            update = update,
            connected = core.connected,
            themeMode = settings.themeMode,
            focusPolicy = settings.focusPolicy,
            timerDefaultMinutes = settings.timerDefaultMinutes,
            timerFadeSeconds = settings.timerFadeSeconds,
            restoreLastMix = settings.restoreLastMix,
            includePrereleaseUpdates = settings.includePrereleaseUpdates,
            expandedCategories = settings.expandedCategories,
            notificationPermissionAsked = settings.notificationPermissionAsked,
            userPresets = settings.userPresets,
            eqSettings = settings.eqSettings,
            fxSettings = settings.fxSettings,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, AmbienceUiState())

    init {
        controllerRepository.connect()

        // Timer and scene-only snapshots must not keep resetting the persistence debounce.
        viewModelScope.launch {
            controllerRepository.snapshot
                .filterNotNull()
                .map { snapshot ->
                    PersistedMixCandidate(
                        mix = MixState(
                            masterVolume = snapshot.masterVolume,
                            masterMuted = snapshot.masterMuted,
                            sources = snapshot.sources,
                        ),
                        presetId = snapshot.activePresetId,
                    )
                }
                .distinctUntilChanged()
                .drop(1)
                .debounce(1200L)
                .collect { candidate ->
                    val mix = candidate.mix
                    if (mix.sources.isNotEmpty() || mix.masterVolume != 0.8f || mix.masterMuted) {
                        settingsRepository.saveLastMix(mix, candidate.presetId)
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

    fun startPassengerAircraftScene(totalDurationMinutes: Int) {
        startScene(SceneOrchestrator.PASSENGER_AIRCRAFT, totalDurationMinutes)
    }

    fun startScene(sceneId: String, totalDurationMinutes: Int) {
        val required = SceneOrchestrator.requiredSourcesFor(sceneId)
        if (required.isEmpty() || required.any { uiState.value.library.manifestFor(it) == null }) {
            val message = when (sceneId) {
                SceneOrchestrator.TRAIN_JOURNEY -> "scene_train_unavailable"
                SceneOrchestrator.FERRY_JOURNEY -> "scene_ferry_unavailable"
                SceneOrchestrator.SPACECRAFT_JOURNEY -> "scene_spacecraft_unavailable"
                SceneOrchestrator.SUBMARINE_JOURNEY -> "scene_submarine_unavailable"
                else -> "scene_aircraft_unavailable"
            }
            _events.tryEmit(AmbienceUiEvent.ShowMessage(message))
            return
        }
        controllerRepository.startScene(sceneId, totalDurationMinutes)
    }

    fun stopScene() = controllerRepository.stopScene()
    fun setSceneDuration(minutes: Int) = controllerRepository.setSceneDuration(minutes)
    fun seekScene(elapsedMs: Long) = controllerRepository.seekScene(elapsedMs)
    fun previousScenePhase() = controllerRepository.stepScenePhase(-1)
    fun nextScenePhase() = controllerRepository.stepScenePhase(1)
    fun setSceneRandomEvents(enabled: Boolean) = controllerRepository.setSceneRandomEvents(enabled)
    fun setSceneMacro(key: String, value: Float) = controllerRepository.setSceneMacro(key, value)

    fun setMasterVolume(volume: Float) = controllerRepository.setMasterVolume(volume)
    fun setMasterMuted(muted: Boolean) = controllerRepository.setMasterMuted(muted)
    fun setSourceVolume(id: String, volume: Float) = controllerRepository.setSourceVolume(id, volume)
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
        if (sceneState.value.active) controllerRepository.stopScene()
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

    fun currentSceneShareUrl(name: String = "Shared Scene"): String? {
        val snapshot = uiState.value.snapshot ?: return null
        val recipe = SceneRecipeCodec.fromSnapshot(snapshot, uiState.value.fxSettings, name)
        return SceneRecipeCodec.toShareUrl(recipe)
    }

    fun importSceneRecipeUrl(url: String?) {
        val recipe = SceneRecipeCodec.fromUrl(url) ?: return
        viewModelScope.launch {
            controllerRepository.connected.filter { it }.first()
            applySceneRecipe(recipe)
        }
    }

    private fun applySceneRecipe(recipe: SceneRecipeV1) {
        if (sceneState.value.active) controllerRepository.stopScene()
        val mix = SceneRecipeCodec.toMixState(recipe)
        controllerRepository.applyMix(json.encodeToString(MixState.serializer(), mix), null)
        setFxSettings(SceneRecipeCodec.toFxSettings(recipe, uiState.value.fxSettings))
        controllerRepository.play()
        _events.tryEmit(AmbienceUiEvent.ShowMessage("scene_recipe_imported"))
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
    fun setIncludePrereleaseUpdates(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setIncludePrereleaseUpdates(enabled) }
    }

    fun setEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) {
        controllerRepository.setEqualizer(enabled, presetName, bands)
        viewModelScope.launch {
            settingsRepository.setEqSettings(EqSettings(enabled = enabled, presetName = presetName, bands = bands))
        }
    }

    fun setFxSettings(settings: FxSettings) {
        val normalized = settings.normalized()
        controllerRepository.setFx(normalized)
        viewModelScope.launch { settingsRepository.setFxSettings(normalized) }
    }

    fun resetFxRack() = setFxSettings(FxSettings())

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
        viewModelScope.launch {
            val includePrereleases = settingsRepository.settingsFlow.value.includePrereleaseUpdates
            updateCoordinator.check(manual, includePrereleases)
        }
    }

    fun downloadUpdate() { viewModelScope.launch { updateCoordinator.downloadAvailable() } }
    fun dismissUpdatePrompt() = updateCoordinator.dismissPrompt()
    fun suppressUpdateFor24Hours() = updateCoordinator.suppressFor24Hours()
    fun consumeInstallUri() = updateCoordinator.consumeInstallUri()
    fun clearUpdateMessage() = updateCoordinator.clearMessage()

    fun clearMessage() = controllerRepository.clearMessage()

    override fun onCleared() {
        controllerRepository.release()
        super.onCleared()
    }
}
