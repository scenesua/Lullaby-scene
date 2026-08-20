package com.scene.ambience

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.scene.ambience.data.model.ThemeMode
import com.scene.ambience.presentation.AmbienceViewModel
import com.scene.ambience.ui.AmbienceApp
import com.scene.ambience.ui.theme.AmbienceTheme
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

class MainActivity : ComponentActivity() {
    private val viewModel: AmbienceViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val themeMode by viewModel.uiState
                .map { it.themeMode }
                .distinctUntilChanged()
                .collectAsStateWithLifecycle(initialValue = ThemeMode.SYSTEM)
            AmbienceTheme(themeMode) {
                AmbienceApp(viewModel)
            }
        }
        handleRecipeIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleRecipeIntent(intent)
    }

    private fun handleRecipeIntent(intent: Intent?) {
        viewModel.importSceneRecipeUrl(intent?.dataString)
    }
}
