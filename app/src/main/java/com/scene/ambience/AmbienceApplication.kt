package com.scene.ambience

import android.app.Application
import com.scene.ambience.data.PresetRepository
import com.scene.ambience.data.SettingsRepository
import com.scene.ambience.data.SoundLibraryRepository

class AmbienceApplication : Application() {

    val libraryRepository: SoundLibraryRepository by lazy { SoundLibraryRepository(this) }
    val settingsRepository: SettingsRepository by lazy { SettingsRepository(this) }
    val presetRepository: PresetRepository by lazy { PresetRepository(settingsRepository) }

    override fun onCreate() {
        super.onCreate()
        libraryRepository.loadNow()
    }
}
