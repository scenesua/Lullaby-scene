package com.scene.ambience.presentation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
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
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.data.model.SoundLibraryState
import com.scene.ambience.data.model.ThemeMode
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

private val BUILT_IN_PRESETS: List<AmbiencePreset> by lazy { BuiltInPresets.createAll() }

data class AmbienceUiState(
    val library: SoundLibraryState = SoundLibraryState(),
    val snapshot: EngineSnapshot? = null,
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
    /** Built-ins are immutable and shared instead of being rebuilt for every engine snapshot. */
    val builtInPresets: List<AmbiencePreset> get() = BUILT_IN_PRESETS
    val allPresets: List<AmbiencePreset> get() = BUILT_IN_PRESETS + userPresets
}

data class AppChromeState(
    val playbackState: PlaybackState = PlaybackState.IDLE,
    val message: String? = null,
)

sealed interface AmbienceUiEvent {
    data class ShowMessage(val message: String) : AmbienceUiEvent
    object RequestNotificationPermission : AmbienceUiEvent
}

class AmbienceViewModel(application: Application) : AndroidViewModel(application) {

    private val json = Json { ignoreUnknownKeys = true }

    val libraryRepository: SoundLibraryRepository = (application as com.scene.ambience.AmbienceApplication).libraryRepository
    val settingsRepository: SettingsRepository = (application as com.scene.ambience.AmbienceApplication).settingsRepository
    private val presetRepository: PresetRepository = (application as com.scene.ambience.AmbienceApplication).presetRepository
    private val controllerRepository = AmbienceControllerRepository(application, viewModelScope)

    private val _events = MutableSharedFlow<AmbienceUiEvent>(extraBufferCapacity = 8)
    val events: SharedFlow<AmbienceUiEvent> = _events.asSharedFlow()

    val uiState: StateFlow<AmbienceUiState> = combine(
        libraryRepository.state,
        controllerRepository.snapshot,
        controllerRepository.connected,
        settingsRepository.settings,
    ) { library, snapshot, connected, settings ->
        AmbienceUiState(
            library = library,
            snapshot = snapshot,
            connected = connected,
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

    /**
     * Most screens do not display the running countdown. Strip timer-only fields so a
     * once-per-second timer update does not invalidate the mixer, presets or settings UI.
     */
    val nonTimerUiState: StateFlow<AmbienceUiState> = uiState
        .map { state ->
            val snapshot = state.snapshot
            if (snapshot == null || (snapshot.sleepTimerRemainingMs == null && !snapshot.sleepFading)) {
                state
            } else {
                state.copy(snapshot = snapshot.copy(sleepTimerRemainingMs = null, sleepFading = false))
            }
        }
        .distinctUntilChanged()
        .stateIn(viewModelScope, SharingStarted.Eagerly, AmbienceUiState())

    /** Minimal state used by the persistent app chrome. */
    val chromeState: StateFlow<AppChromeState> = uiState
        .map { state ->
            AppChromeState(
                playbackState = state.snapshot?.playbackState ?: PlaybackState.IDLE,
                message = state.snapshot?.message,
            )
        }
        .distinctUntilChanged()
        .stateIn(viewModelScope, SharingStarted.Eagerly, AppChromeState())

    init {
        controllerRepository.connect()

        // Persist the last mix so the service can restore it after restart.
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

    // -------- transport -----------------------------------------------------------

    fun togglePlayPause() {
        val snapshot = uiState.value.snapshot
        if (snapshot?.activeSourceCount == 0) {
            _events.tryEmit(AmbienceUiEvent.ShowMessage("no_active_sources"))
            return
        }
        if (snapshot?.playbackState == PlaybackState.PLAYING) {
            controllerRepository.pause()
        } else {
            controllerRepository.play()
        }
    }

    fun stop() = controllerRepository.stop()

    // -------- mixer ----------------------------------------------------------------

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

    /** Turns every source off at once. Used by the mixer's reset-all button. */
    fun disableAllSources() = controllerRepository.disableAllSources()

    // -------- presets ----------------------------------------------------------------

    fun applyPreset(preset: AmbiencePreset) {
        val mixJson = json.encodeToString(MixState.serializer(), preset.mix)
        controllerRepository.applyMix(mixJson, preset.id)
        val snapshot = uiState.value.snapshot
        if (snapshot?.playbackState != PlaybackState.PLAYING) {
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
        viewModelScope.launch {
            presetRepository.renamePreset(id, newName, uiState.value.userPresets)
        }
    }

    fun deletePreset(id: String) {
        viewModelScope.launch {
            presetRepository.deletePreset(id, uiState.value.userPresets)
        }
    }

    // -------- sleep timer -------------------------------------------------------------

    fun startSleepTimer(durationMs: Long) {
        val fadeMs = uiState.value.timerFadeSeconds * 1000L
        controllerRepository.startSleepTimer(durationMs, fadeMs)
        viewModelScope.launch {
            settingsRepository.saveSleepTimer(System.currentTimeMillis() + durationMs, fadeMs)
        }
    }

    fun cancelSleepTimer() {
        controllerRepository.cancelSleepTimer()
        viewModelScope.launch {
            settingsRepository.clearSleepTimer()
        }
    }

    // -------- settings -----------------------------------------------------------------

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { settingsRepository.setThemeMode(mode) }
    }

    fun setFocusPolicy(policy: FocusPolicy) {
        viewModelScope.launch { settingsRepository.setFocusPolicy(policy) }
    }

    fun setTimerDefaults(minutes: Int, fadeSeconds: Int) {
        viewModelScope.launch { settingsRepository.setTimerDefaults(minutes, fadeSeconds) }
    }

    fun setRestoreLastMix(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setRestoreLastMix(enabled) }
    }

    fun setEqualizer(enabled: Boolean, presetName: String, bands: List<Int>) {
        controllerRepository.setEqualizer(enabled, presetName, bands)
        viewModelScope.launch {
            settingsRepository.setEqSettings(
                EqSettings(enabled = enabled, presetName = presetName, bands = bands)
            )
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

    fun clearMessage() = controllerRepository.clearMessage()

    override fun onCleared() {
        controllerRepository.release()
        super.onCleared()
    }
}
