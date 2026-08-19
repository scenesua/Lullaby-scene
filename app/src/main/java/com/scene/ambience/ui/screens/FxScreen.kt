package com.scene.ambience.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.scene.ambience.R
import com.scene.ambience.data.model.FxSettings
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel
import kotlin.math.roundToInt

@Composable
fun FxScreen(
    state: AmbienceUiState,
    viewModel: AmbienceViewModel,
    onOpenEq: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var fx by remember { mutableStateOf(state.fxSettings) }

    LaunchedEffect(state.fxSettings) {
        if (state.fxSettings != fx) fx = state.fxSettings
    }

    fun push(next: FxSettings) {
        fx = next.normalized()
        viewModel.setFxSettings(fx)
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(context.getString(R.string.fx_master), style = MaterialTheme.typography.titleMedium)
                        Text(
                            context.getString(R.string.fx_master_desc),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = fx.enabled,
                        onCheckedChange = { push(fx.copy(enabled = it)) },
                    )
                }
            }
        }

        item {
            FxRackSection(
                title = context.getString(R.string.fx_tone),
                subtitle = context.getString(R.string.fx_tone_desc),
                initiallyExpanded = true,
            ) {
                FxSlider(
                    title = context.getString(R.string.fx_warmth),
                    subtitle = context.getString(R.string.fx_warmth_desc),
                    value = fx.warmth,
                    enabled = fx.enabled,
                    onValueChange = { push(fx.copy(warmth = it)) },
                )
                FxSlider(
                    title = context.getString(R.string.fx_air),
                    subtitle = context.getString(R.string.fx_air_desc),
                    value = fx.air,
                    enabled = fx.enabled,
                    onValueChange = { push(fx.copy(air = it)) },
                )
            }
        }

        item {
            FxRackSection(
                title = context.getString(R.string.fx_body),
                subtitle = context.getString(R.string.fx_body_desc),
            ) {
                FxSlider(
                    title = context.getString(R.string.fx_body_amount),
                    subtitle = context.getString(R.string.fx_body_amount_desc),
                    value = fx.body,
                    enabled = fx.enabled,
                    onValueChange = { push(fx.copy(body = it)) },
                )
            }
        }

        item {
            FxRackSection(
                title = context.getString(R.string.fx_space),
                subtitle = context.getString(R.string.fx_space_desc),
                initiallyExpanded = true,
            ) {
                FxSlider(
                    title = context.getString(R.string.fx_space_amount),
                    subtitle = context.getString(R.string.fx_space_amount_desc),
                    value = fx.space,
                    enabled = fx.enabled,
                    onValueChange = { push(fx.copy(space = it)) },
                )
            }
        }

        item {
            FxRackSection(
                title = context.getString(R.string.fx_dynamics),
                subtitle = context.getString(R.string.fx_dynamics_desc),
            ) {
                FxSlider(
                    title = context.getString(R.string.fx_glue),
                    subtitle = context.getString(R.string.fx_glue_desc),
                    value = fx.glue,
                    enabled = fx.enabled,
                    onValueChange = { push(fx.copy(glue = it)) },
                )
            }
        }

        item {
            FxRackSection(
                title = context.getString(R.string.fx_output),
                subtitle = context.getString(R.string.fx_output_desc),
            ) {
                FxSlider(
                    title = context.getString(R.string.fx_loudness),
                    subtitle = context.getString(R.string.fx_loudness_desc),
                    value = fx.loudness,
                    enabled = fx.enabled,
                    onValueChange = { push(fx.copy(loudness = it)) },
                )
            }
        }

        item {
            FxRackSection(
                title = context.getString(R.string.settings_eq),
                subtitle = context.getString(R.string.settings_eq_desc),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            if (state.eqSettings.enabled) context.getString(R.string.fx_eq_on)
                            else context.getString(R.string.fx_eq_off),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            context.getString(R.string.fx_eq_editor_desc),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = state.eqSettings.enabled,
                        onCheckedChange = { enabled ->
                            viewModel.setEqualizer(enabled, state.eqSettings.presetName, state.eqSettings.bands)
                        },
                    )
                }
                Button(onClick = onOpenEq, modifier = Modifier.fillMaxWidth()) {
                    Text(context.getString(R.string.fx_open_eq))
                }
            }
        }

        item {
            Button(
                onClick = {
                    fx = FxSettings()
                    viewModel.resetFxRack()
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Filled.RestartAlt, contentDescription = null)
                Text(context.getString(R.string.fx_reset), modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun FxRackSection(
    title: String,
    subtitle: String,
    initiallyExpanded: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    var expanded by rememberSaveable(title) { mutableStateOf(initiallyExpanded) }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium)
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = { expanded = !expanded }) {
                    Icon(
                        if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                        contentDescription = null,
                    )
                }
            }
            if (expanded) {
                Column(
                    modifier = Modifier.padding(top = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    content = content,
                )
            }
        }
    }
}

@Composable
private fun FxSlider(
    title: String,
    subtitle: String,
    value: Float,
    enabled: Boolean,
    onValueChange: (Float) -> Unit,
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text("${(value * 100f).roundToInt()}%", style = MaterialTheme.typography.labelMedium)
        }
        Text(
            subtitle,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Slider(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            valueRange = 0f..1f,
        )
    }
}
