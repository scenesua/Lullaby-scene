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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.scene.ambience.R
import com.scene.ambience.media.AircraftJourneyTimelineBuilder
import com.scene.ambience.media.SceneOrchestrator
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel
import com.scene.ambience.ui.AmbienceStrings
import kotlin.math.roundToInt

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
    var selectedDuration by remember { mutableIntStateOf(if (active) scene.totalDurationMinutes else 480) }

    LaunchedEffect(scene.totalDurationMinutes, active) {
        if (active) selectedDuration = scene.totalDurationMinutes
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(text = context.getString(R.string.scenes_question), style = MaterialTheme.typography.headlineMedium)
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
                        Text(context.getString(R.string.scene_asset_unavailable), color = MaterialTheme.colorScheme.error)
                    } else if (!active) {
                        Text(context.getString(R.string.scene_duration_title), style = MaterialTheme.typography.titleSmall)
                        DurationSelector(selectedDuration) { selectedDuration = it }
                        Text(
                            context.getString(R.string.scene_duration_hint),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Button(
                            onClick = { viewModel.startPassengerAircraftScene(selectedDuration) },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(context.getString(R.string.scene_start)) }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(sceneStateLabel(scene.stateId, context), style = MaterialTheme.typography.titleMedium)
                                Text(
                                    text = context.getString(R.string.scene_elapsed, AmbienceStrings.formatCountdown(scene.elapsedMs)),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    text = context.getString(R.string.scene_remaining, AmbienceStrings.formatCountdown(scene.remainingMs)),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            OutlinedButton(onClick = viewModel::stopScene) { Text(context.getString(R.string.scene_end)) }
                        }

                        val journeyTotalMs = (scene.totalDurationMinutes * 60_000L).coerceAtLeast(1L)
                        val journeySeekMax = (journeyTotalMs - 1L).coerceAtLeast(0L)
                        var seekDragging by remember(active) { mutableStateOf(false) }
                        var seekPreviewMs by remember(active) { mutableStateOf(scene.elapsedMs.coerceIn(0L, journeySeekMax).toFloat()) }
                        LaunchedEffect(scene.elapsedMs, journeySeekMax, seekDragging) {
                            if (!seekDragging) seekPreviewMs = scene.elapsedMs.coerceIn(0L, journeySeekMax).toFloat()
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                OutlinedButton(
                                    onClick = viewModel::previousScenePhase,
                                    modifier = Modifier.weight(1f),
                                ) { Text(context.getString(R.string.scene_previous_phase)) }
                                Button(
                                    onClick = viewModel::nextScenePhase,
                                    modifier = Modifier.weight(1f),
                                ) { Text(context.getString(R.string.scene_next_phase)) }
                            }
                            Slider(
                                value = seekPreviewMs.coerceIn(0f, journeySeekMax.toFloat().coerceAtLeast(1f)),
                                onValueChange = {
                                    seekDragging = true
                                    seekPreviewMs = it
                                },
                                onValueChangeFinished = {
                                    seekDragging = false
                                    viewModel.seekScene(seekPreviewMs.toLong().coerceIn(0L, journeySeekMax))
                                },
                                valueRange = 0f..journeySeekMax.toFloat().coerceAtLeast(1f),
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    AmbienceStrings.formatCountdown(seekPreviewMs.toLong()),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    AmbienceStrings.formatCountdown(journeyTotalMs),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }

                        Text(
                            text = context.getString(if (scene.seatbeltSignOn) R.string.scene_seatbelt_on else R.string.scene_seatbelt_off),
                            style = MaterialTheme.typography.labelLarge,
                            color = if (scene.seatbeltSignOn) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        scene.activeEventId?.let { eventId ->
                            Text(
                                text = when (eventId) {
                                    AircraftJourneyTimelineBuilder.EVENT_TURBULENCE -> context.getString(R.string.scene_event_turbulence)
                                    AircraftJourneyTimelineBuilder.EVENT_CABIN_ACTIVITY -> context.getString(R.string.scene_event_cabin)
                                    else -> eventId
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                        }

                        Text(context.getString(R.string.scene_duration_title), style = MaterialTheme.typography.titleSmall)
                        DurationSelector(selectedDuration) { minutes ->
                            selectedDuration = minutes
                            viewModel.setSceneDuration(minutes)
                        }
                        Text(
                            context.getString(R.string.scene_duration_hint),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

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
private fun DurationSelector(selectedMinutes: Int, onSelect: (Int) -> Unit) {
    val context = LocalContext.current
    var directText by remember { mutableStateOf(formatHHMM(selectedMinutes)) }
    var directError by remember { mutableStateOf(false) }

    LaunchedEffect(selectedMinutes) {
        directText = formatHHMM(selectedMinutes)
        directError = false
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AircraftJourneyTimelineBuilder.FIXED_DURATION_MINUTES.forEach { minutes ->
                FilterChip(
                    selected = selectedMinutes == minutes,
                    onClick = { onSelect(minutes) },
                    label = { Text(formatDuration(minutes)) },
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("1m", style = MaterialTheme.typography.labelSmall)
            Text(formatDuration(selectedMinutes), style = MaterialTheme.typography.titleSmall)
            Text("12h", style = MaterialTheme.typography.labelSmall)
        }
        Slider(
            value = selectedMinutes.coerceIn(
                AircraftJourneyTimelineBuilder.FREE_INPUT_MINUTES,
                AircraftJourneyTimelineBuilder.SLIDER_MAX_MINUTES,
            ).toFloat(),
            onValueChange = { raw -> onSelect(raw.roundToInt().coerceAtLeast(1)) },
            valueRange = AircraftJourneyTimelineBuilder.FREE_INPUT_MINUTES.toFloat()..AircraftJourneyTimelineBuilder.SLIDER_MAX_MINUTES.toFloat(),
        )
        Text(
            context.getString(R.string.scene_duration_slider_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Text(context.getString(R.string.scene_duration_direct), style = MaterialTheme.typography.titleSmall)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = directText,
                onValueChange = { raw ->
                    val digits = raw.filter(Char::isDigit)
                    directText = when {
                        digits.length >= 3 -> digits.dropLast(2) + ":" + digits.takeLast(2)
                        else -> digits
                    }
                    directError = false
                },
                modifier = Modifier.weight(1f),
                singleLine = true,
                isError = directError,
                label = { Text("HH:MM") },
                supportingText = {
                    Text(
                        if (directError) context.getString(R.string.scene_duration_direct_error)
                        else context.getString(R.string.scene_duration_direct_hint)
                    )
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            )
            Button(onClick = {
                val parsed = parseHHMM(directText)
                if (parsed == null) directError = true else onSelect(parsed)
            }) {
                Text(context.getString(R.string.scene_duration_apply))
            }
        }
    }
}

private fun parseHHMM(value: String): Int? {
    val match = Regex("^(\\d+):([0-5]\\d)$").matchEntire(value.trim()) ?: return null
    val hours = match.groupValues[1].toLongOrNull() ?: return null
    val minutes = match.groupValues[2].toIntOrNull() ?: return null
    val total = hours * 60L + minutes
    return total.takeIf { it in 1..Int.MAX_VALUE.toLong() }?.toInt()
}

private fun formatHHMM(minutes: Int): String {
    val safe = minutes.coerceAtLeast(1)
    return "%02d:%02d".format(safe / 60, safe % 60)
}

private fun formatDuration(minutes: Int): String {
    val safe = minutes.coerceAtLeast(1)
    val hours = safe / 60
    val remainder = safe % 60
    return when {
        hours == 0 -> "${remainder}m"
        remainder == 0 -> "${hours}h"
        else -> "${hours}h ${remainder}m"
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
    SceneOrchestrator.STATE_TAXI_OUT -> context.getString(R.string.scene_state_taxi_out)
    SceneOrchestrator.STATE_TAKEOFF -> context.getString(R.string.scene_state_takeoff)
    SceneOrchestrator.STATE_CLIMB -> context.getString(R.string.scene_state_climb)
    SceneOrchestrator.STATE_CRUISE -> context.getString(R.string.scene_state_cruise)
    SceneOrchestrator.STATE_DESCENT -> context.getString(R.string.scene_state_descent)
    SceneOrchestrator.STATE_APPROACH -> context.getString(R.string.scene_state_approach)
    SceneOrchestrator.STATE_TAXI_IN -> context.getString(R.string.scene_state_taxi_in)
    SceneOrchestrator.STATE_ARRIVED -> context.getString(R.string.scene_state_arrived)
    else -> context.getString(R.string.scene_state_cruise)
}
