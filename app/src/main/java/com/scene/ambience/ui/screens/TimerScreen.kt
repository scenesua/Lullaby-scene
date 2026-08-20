package com.scene.ambience.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.scene.ambience.R
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel
import com.scene.ambience.ui.AmbienceStrings

private val TIMER_PRESETS_MINUTES = listOf(15, 30, 45, 60, 90, 120)
private const val MAX_CUSTOM_MINUTES = 1440

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TimerScreen(
    state: AmbienceUiState,
    viewModel: AmbienceViewModel,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val remaining by viewModel.timerRemaining.collectAsStateWithLifecycle()
    val remainingMs = remaining ?: 0L
    val running = remainingMs > 0L
    val fadeSeconds = state.timerFadeSeconds

    var customMinutes by remember { mutableStateOf("") }
    val customValue = customMinutes.toIntOrNull()
    val customInvalid = customMinutes.isNotEmpty() &&
        (customValue == null || customValue < 1 || customValue > MAX_CUSTOM_MINUTES)

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Card {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.NightsStay,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(48.dp),
                    )
                    Text(
                        text = if (running) AmbienceStrings.formatCountdown(remainingMs) else context.getString(R.string.timer_off),
                        style = MaterialTheme.typography.displaySmall,
                    )
                    Text(
                        text = if (running) {
                            context.getString(R.string.timer_running)
                        } else {
                            context.getString(R.string.timer_not_running)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline,
                        textAlign = TextAlign.Center,
                    )
                    if (running) {
                        OutlinedButton(onClick = viewModel::cancelSleepTimer) {
                            Text(context.getString(R.string.timer_cancel))
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = context.getString(R.string.timer_presets),
                style = MaterialTheme.typography.titleMedium,
            )
        }

        item {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TIMER_PRESETS_MINUTES.forEach { minutes ->
                    AssistChip(
                        onClick = { viewModel.startSleepTimer(minutes * 60_000L) },
                        label = { Text(context.getString(R.string.timer_minutes, minutes)) },
                    )
                }
            }
        }

        item {
            Card {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = context.getString(R.string.timer_custom_title),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedTextField(
                            value = customMinutes,
                            onValueChange = { input ->
                                customMinutes = input.filter { it.isDigit() }.take(4)
                            },
                            modifier = Modifier.weight(1f),
                            label = { Text(context.getString(R.string.timer_custom_placeholder)) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            isError = customInvalid,
                            supportingText = if (customInvalid) {
                                { Text(context.getString(R.string.timer_custom_error)) }
                            } else {
                                null
                            },
                        )
                        OutlinedButton(
                            enabled = !customInvalid && customValue != null,
                            onClick = {
                                customValue?.let { viewModel.startSleepTimer(it * 60_000L) }
                            },
                        ) {
                            Text(context.getString(R.string.timer_custom_start))
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = context.getString(R.string.timer_fade_hint, fadeSeconds),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
            )
        }
    }
}
