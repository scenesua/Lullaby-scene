package com.scene.ambience.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.scene.ambience.BuildConfig
import com.scene.ambience.R
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.ThemeMode
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel

@Composable
fun SettingsScreen(
    state: AmbienceUiState,
    viewModel: AmbienceViewModel,
    onOpenEq: () -> Unit,
    onOpenLicenses: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionTitle(context.getString(R.string.settings_appearance))
            RadioSetting(
                title = context.getString(R.string.theme),
                options = listOf(
                    context.getString(R.string.theme_system) to ThemeMode.SYSTEM,
                    context.getString(R.string.theme_light) to ThemeMode.LIGHT,
                    context.getString(R.string.theme_dark) to ThemeMode.DARK,
                ),
                selected = state.themeMode,
                onSelect = viewModel::setThemeMode,
            )
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_playback))
            RadioSetting(
                title = context.getString(R.string.focus),
                options = listOf(
                    context.getString(R.string.focus_pause) to FocusPolicy.PAUSE,
                    context.getString(R.string.focus_duck) to FocusPolicy.DUCK,
                    context.getString(R.string.focus_continue) to FocusPolicy.CONTINUE,
                ),
                selected = state.focusPolicy,
                onSelect = viewModel::setFocusPolicy,
            )
            SwitchSetting(
                title = context.getString(R.string.restore_mix),
                subtitle = context.getString(R.string.restore_mix_desc),
                checked = state.restoreLastMix,
                onCheckedChange = viewModel::setRestoreLastMix,
            )
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_timer))
            Card {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(context.getString(R.string.default_minutes))
                    Slider(
                        value = state.timerDefaultMinutes.toFloat(),
                        onValueChange = { viewModel.setTimerDefaults(it.toInt(), state.timerFadeSeconds) },
                        valueRange = 5f..180f,
                        steps = 34,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = context.getString(R.string.timer_minutes, state.timerDefaultMinutes),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(context.getString(R.string.fade_seconds))
                    Slider(
                        value = state.timerFadeSeconds.toFloat(),
                        onValueChange = { viewModel.setTimerDefaults(state.timerDefaultMinutes, it.toInt()) },
                        valueRange = 0f..120f,
                        steps = 23,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = context.getString(R.string.timer_fade_hint, state.timerFadeSeconds),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                    )
                }
            }
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_eq))
            Card(onClick = onOpenEq, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(context.getString(R.string.settings_eq), style = MaterialTheme.typography.bodyLarge)
                        Text(
                            text = context.getString(R.string.settings_eq_desc),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline,
                        )
                    }
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
                    Spacer(Modifier.width(4.dp))
                    Switch(
                        checked = state.eqSettings.enabled,
                        onCheckedChange = { enabled ->
                            viewModel.setEqualizer(enabled, state.eqSettings.presetName, state.eqSettings.bands)
                        },
                    )
                }
            }
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_update))
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        context.getString(R.string.update_current_version, BuildConfig.VERSION_NAME),
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        context.getString(R.string.update_channel_github),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                context.getString(R.string.update_include_prerelease),
                                style = MaterialTheme.typography.bodyLarge,
                            )
                            Text(
                                context.getString(R.string.update_include_prerelease_desc),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline,
                            )
                        }
                        Switch(
                            checked = state.includePrereleaseUpdates,
                            onCheckedChange = viewModel::setIncludePrereleaseUpdates,
                        )
                    }
                    state.update.available?.let { available ->
                        Text(
                            context.getString(R.string.update_available_version, available.version),
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.titleSmall,
                        )
                    }
                    if (state.update.downloading) {
                        LinearProgressIndicator(
                            progress = { ((state.update.downloadProgress ?: 0) / 100f).coerceIn(0f, 1f) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(context.getString(R.string.update_downloading, state.update.downloadProgress ?: 0))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { viewModel.checkForUpdates(manual = true) },
                            enabled = !state.update.checking && !state.update.downloading,
                        ) {
                            Text(
                                if (state.update.checking) context.getString(R.string.update_checking)
                                else context.getString(R.string.update_check_now)
                            )
                        }
                        if (state.update.available != null && !state.update.downloading) {
                            Button(onClick = viewModel::downloadUpdate) {
                                Text(context.getString(R.string.update_now))
                            }
                        }
                    }
                }
            }
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_about))
            Card(onClick = onOpenLicenses, modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(context.getString(R.string.licenses), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text = text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(vertical = 4.dp))
}

@Composable
private fun <T> RadioSetting(
    title: String,
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            options.forEach { (label, value) ->
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = value == selected, onClick = { onSelect(value) })
                    Text(label, modifier = Modifier.padding(start = 8.dp))
                }
            }
        }
    }
}

@Composable
private fun SwitchSetting(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Card {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.bodyLarge)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}
