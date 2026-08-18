package com.scene.ambience.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.scene.ambience.R
import com.scene.ambience.media.SceneOrchestrator
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel
import com.scene.ambience.ui.AmbienceStrings

@Composable
fun ScenesScreen(
    state: AmbienceUiState,
    viewModel: AmbienceViewModel,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scene = state.scene
    val active = scene.sceneId == SceneOrchestrator.PASSENGER_AIRCRAFT
    val available = state.library.manifestFor(SceneOrchestrator.SOURCE_AIRCRAFT) != null
    var selectedArc by remember { mutableIntStateOf(if (scene.arcMinutes in listOf(0, 30, 60, 120)) scene.arcMinutes else 60) }

    LaunchedEffect(scene.arcMinutes, active) {
        if (active) selectedArc = scene.arcMinutes
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(
                text = context.getString(R.string.scenes_question),
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                text = context.getString(R.string.scenes_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Flight, contentDescription = null)
                        Column(modifier = Modifier.padding(start = 12.dp)) {
                            Text(context.getString(R.string.scene_aircraft_name), style = MaterialTheme.typography.titleLarge)
                            Text(
                                context.getString(R.string.scene_aircraft_description),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    if (!available) {
                        Text(
                            context.getString(R.string.scene_asset_unavailable),
                            color = MaterialTheme.colorScheme.error,
                        )
                    } else if (!active) {
                        Text(context.getString(R.string.scene_arc_title), style = MaterialTheme.typography.titleSmall)
                        ArcSelector(selectedArc) { selectedArc = it }
                        Button(
                            onClick = { viewModel.startPassengerAircraftScene(selectedArc) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(context.getString(R.string.scene_start))
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    text = sceneStateLabel(scene.stateId, context),
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(
                                    text = context.getString(
                                        R.string.scene_elapsed,
                                        AmbienceStrings.formatCountdown(scene.elapsedMs),
                                    ),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            OutlinedButton(onClick = viewModel::stopScene) {
                                Text(context.getString(R.string.scene_end))
                            }
                        }

                        Text(context.getString(R.string.scene_arc_title), style = MaterialTheme.typography.titleSmall)
                        ArcSelector(selectedArc) { minutes ->
                            selectedArc = minutes
                            viewModel.setSceneArc(minutes)
                        }

                        Spacer(Modifier.height(2.dp))
                        Text(context.getString(R.string.scene_macros_title), style = MaterialTheme.typography.titleMedium)
                        MacroSlider(
                            title = context.getString(R.string.macro_engine_presence),
                            subtitle = context.getString(R.string.macro_engine_presence_desc),
                            value = scene.macros.enginePresence,
                            onValueChange = { viewModel.setSceneMacro(SceneOrchestrator.MACRO_ENGINE_PRESENCE, it) },
                        )
                        MacroSlider(
                            title = context.getString(R.string.macro_cabin_activity),
                            subtitle = context.getString(R.string.macro_cabin_activity_desc),
                            value = scene.macros.cabinActivity,
                            onValueChange = { viewModel.setSceneMacro(SceneOrchestrator.MACRO_CABIN_ACTIVITY, it) },
                        )
                        MacroSlider(
                            title = context.getString(R.string.macro_turbulence),
                            subtitle = context.getString(R.string.macro_turbulence_desc),
                            value = scene.macros.turbulence,
                            onValueChange = { viewModel.setSceneMacro(SceneOrchestrator.MACRO_TURBULENCE, it) },
                        )
                        MacroSlider(
                            title = context.getString(R.string.macro_night_depth),
                            subtitle = context.getString(R.string.macro_night_depth_desc),
                            value = scene.macros.nightDepth,
                            onValueChange = { viewModel.setSceneMacro(SceneOrchestrator.MACRO_NIGHT_DEPTH, it) },
                        )
                        Text(
                            text = context.getString(R.string.scene_spatial_hint),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ArcSelector(selected: Int, onSelect: (Int) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(0, 30, 60, 120).forEach { minutes ->
            FilterChip(
                selected = selected == minutes,
                onClick = { onSelect(minutes) },
                label = { Text(if (minutes == 0) "∞" else "${minutes}m") },
            )
        }
    }
}

@Composable
private fun MacroSlider(
    title: String,
    subtitle: String,
    value: Float,
    onValueChange: (Float) -> Unit,
) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text("${(value * 100).toInt()}%", style = MaterialTheme.typography.labelMedium)
        }
        Text(
            subtitle,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Slider(value = value, onValueChange = onValueChange, valueRange = 0f..1f)
    }
}

private fun sceneStateLabel(id: String?, context: android.content.Context): String = when (id) {
    SceneOrchestrator.STATE_SETTLING -> context.getString(R.string.scene_state_settling)
    SceneOrchestrator.STATE_CRUISE -> context.getString(R.string.scene_state_cruise)
    SceneOrchestrator.STATE_DROWSY -> context.getString(R.string.scene_state_drowsy)
    SceneOrchestrator.STATE_DEEP_NIGHT -> context.getString(R.string.scene_state_deep_night)
    else -> context.getString(R.string.scene_state_cruise)
}
