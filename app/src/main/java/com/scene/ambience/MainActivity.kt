package com.scene.ambience

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.scene.ambience.data.model.ThemeMode
import com.scene.ambience.presentation.AmbienceViewModel
import com.scene.ambience.ui.AmbienceApp
import com.scene.ambience.ui.theme.AmbienceTheme
import kotlinx.coroutines.flow.map

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val viewModel: AmbienceViewModel = viewModel()
            val themeMode by viewModel.uiState
                .map { it.themeMode }
                .collectAsStateWithLifecycle(initialValue = ThemeMode.SYSTEM)
            AmbienceTheme(themeMode) {
                AmbienceApp(viewModel)
            }
        }
    }
}
