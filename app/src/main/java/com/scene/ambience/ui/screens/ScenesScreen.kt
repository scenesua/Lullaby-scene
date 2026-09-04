package com.scene.ambience.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.DirectionsBoat
import androidx.compose.material.icons.filled.RocketLaunch
import androidx.compose.material.icons.filled.Train
import androidx.compose.material.icons.filled.Waves
import androidx.compose.material.icons.filled.LocationCity
import androidx.compose.material.icons.filled.Park
import androidx.compose.material.icons.filled.Check
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import com.scene.ambience.ui.components.SceneSlider as Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.scene.ambience.R
import com.scene.ambience.data.model.SourceCatalog
import com.scene.ambience.data.model.UiCategory
import com.scene.ambience.media.AircraftJourneyTimelineBuilder
import com.scene.ambience.media.SceneOrchestrator
import com.scene.ambience.media.TrainJourneyTimeline
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
    val scene by viewModel.sceneState.collectAsStateWithLifecycle()
    var selectedSceneId by rememberSaveable { mutableStateOf(scene.sceneId ?: SceneOrchestrator.PASSENGER_AIRCRAFT) }
    val active = scene.sceneId == selectedSceneId
    val hoodGold = Color(0xFFD8B35F)
    val isAircraft = selectedSceneId == SceneOrchestrator.PASSENGER_AIRCRAFT
    val available = SceneOrchestrator.requiredSourcesFor(selectedSceneId).all { state.library.manifestFor(it) != null }
    var selectedDuration by remember { mutableIntStateOf(if (active) scene.totalDurationMinutes else 480) }
    var extraSoundsByJourney by remember { mutableStateOf<Map<String, List<String>>>(emptyMap()) }
    var extraMenuExpanded by remember { mutableStateOf(false) }
    var pendingExtraSoundId by remember(selectedSceneId) { mutableStateOf<String?>(null) }
    val selectedExtraSounds = extraSoundsByJourney[selectedSceneId].orEmpty()
    val extraSoundCandidates = SourceCatalog.all.filter { definition ->
        definition.uiCategory != UiCategory.JOURNEY_EVENTS &&
            !definition.sourceId.id.contains("_journey_") &&
            !definition.sourceId.id.startsWith("forest_temple_") &&
            definition.sourceId.id != "aircraft_cabin" &&
            state.library.manifestFor(definition.sourceId.id) != null
    }

    LaunchedEffect(scene.sceneId) {
        if (scene.active) selectedSceneId = scene.sceneId!!
    }
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
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                JOURNEY_IDS.forEach { journeyId ->
                    FilterChip(
                        modifier = Modifier.heightIn(min = 48.dp).then(if (journeyId == SceneOrchestrator.HOOD_JOURNEY) Modifier.border(1.dp, hoodGold.copy(alpha = if (selectedSceneId == journeyId) .92f else .46f), RoundedCornerShape(8.dp)) else Modifier),
                        selected = selectedSceneId == journeyId,
                        onClick = {
                            if (selectedSceneId != journeyId) {
                                if (scene.active) viewModel.stopScene()
                                selectedSceneId = journeyId
                            }
                        },
                        leadingIcon = if (selectedSceneId == journeyId) ({ Icon(Icons.Filled.Check, contentDescription = null) }) else null,
                        label = { Text(context.getString(sceneShortNameRes(journeyId)), color = if (journeyId == SceneOrchestrator.HOOD_JOURNEY) hoodGold else Color.Unspecified) },
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                border = if (selectedSceneId == SceneOrchestrator.HOOD_JOURNEY) BorderStroke(1.dp, hoodGold.copy(alpha = .56f)) else null,
                colors = CardDefaults.cardColors(
                    containerColor = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            when (selectedSceneId) {
                                SceneOrchestrator.TRAIN_JOURNEY -> Icons.Filled.Train
                                SceneOrchestrator.FERRY_JOURNEY -> Icons.Filled.DirectionsBoat
                                SceneOrchestrator.SPACECRAFT_JOURNEY -> Icons.Filled.RocketLaunch
                                SceneOrchestrator.SUBMARINE_JOURNEY -> Icons.Filled.Waves
                                SceneOrchestrator.HOOD_JOURNEY -> Icons.Filled.LocationCity
                                SceneOrchestrator.FOREST_TEMPLE_JOURNEY -> Icons.Filled.Park
                                else -> Icons.Filled.Flight
                            },
                            contentDescription = null,
                            tint = if (selectedSceneId == SceneOrchestrator.HOOD_JOURNEY) hoodGold else Color.Unspecified,
                        )
                        Column(modifier = Modifier.padding(start = 12.dp)) {
                            Text(
                                context.getString(sceneNameRes(selectedSceneId)),
                                style = MaterialTheme.typography.titleLarge,
                                color = if (selectedSceneId == SceneOrchestrator.HOOD_JOURNEY) hoodGold else Color.Unspecified,
                            )
                            Text(
                                context.getString(sceneDescriptionRes(selectedSceneId)),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    Text(stringResource(R.string.scene_add_sound_title), style = MaterialTheme.typography.titleSmall)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(modifier = Modifier.weight(1f)) {
                            OutlinedButton(
                                onClick = { extraMenuExpanded = true },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                val selected = extraSoundCandidates.firstOrNull { it.sourceId.id == pendingExtraSoundId }
                                Text(stringResource(selected?.displayNameRes ?: R.string.scene_choose_sound))
                            }
                            DropdownMenu(expanded = extraMenuExpanded, onDismissRequest = { extraMenuExpanded = false }) {
                                extraSoundCandidates.filterNot { it.sourceId.id in selectedExtraSounds }.forEach { definition ->
                                    DropdownMenuItem(
                                        text = { Text(stringResource(definition.displayNameRes)) },
                                        onClick = {
                                            pendingExtraSoundId = definition.sourceId.id
                                            extraMenuExpanded = false
                                        },
                                    )
                                }
                            }
                        }
                        Button(
                            enabled = pendingExtraSoundId != null && selectedExtraSounds.size < 6,
                            onClick = {
                                val id = pendingExtraSoundId ?: return@Button
                                extraSoundsByJourney = extraSoundsByJourney + (selectedSceneId to (selectedExtraSounds + id).distinct().take(6))
                                pendingExtraSoundId = null
                                if (active) viewModel.setSourceVolume(id, 0.25f)
                            },
                        ) { Text(stringResource(R.string.scene_add_sound_action)) }
                    }
                    if (selectedExtraSounds.isEmpty()) {
                        Text(stringResource(R.string.scene_no_added_sounds), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        selectedExtraSounds.forEach { sourceId ->
                            val definition = extraSoundCandidates.firstOrNull { it.sourceId.id == sourceId } ?: return@forEach
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(stringResource(definition.displayNameRes), style = MaterialTheme.typography.bodyMedium)
                                OutlinedButton(onClick = {
                                    extraSoundsByJourney = extraSoundsByJourney + (selectedSceneId to selectedExtraSounds.filterNot { it == sourceId })
                                    if (active) viewModel.setSourceVolume(sourceId, 0f)
                                }) { Text(stringResource(R.string.scene_remove_sound_action)) }
                            }
                        }
                    }

                    if (!available) {
                        Text(
                            context.getString(sceneUnavailableRes(selectedSceneId)),
                            color = MaterialTheme.colorScheme.error,
                        )
                    } else if (!active) {
                        Text(context.getString(R.string.scene_duration_title), style = MaterialTheme.typography.titleSmall)
                        DurationSelector(selectedDuration) { selectedDuration = it }
                        Text(
                            context.getString(R.string.scene_duration_hint),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Button(
                            onClick = { viewModel.startScene(selectedSceneId, selectedDuration, selectedExtraSounds) },
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

                        if (isAircraft) {
                            Text(
                                text = context.getString(if (scene.seatbeltSignOn) R.string.scene_seatbelt_on else R.string.scene_seatbelt_off),
                                style = MaterialTheme.typography.labelLarge,
                                color = if (scene.seatbeltSignOn) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        scene.activeEventId?.let { eventId ->
                            Text(
                                text = when (eventId) {
                                    AircraftJourneyTimelineBuilder.EVENT_TURBULENCE -> context.getString(R.string.scene_event_turbulence)
                                    AircraftJourneyTimelineBuilder.EVENT_CABIN_ACTIVITY -> context.getString(R.string.scene_event_cabin)
                                    TrainJourneyTimeline.EVENT_DEPARTURE -> context.getString(R.string.scene_event_train_departure)
                                    TrainJourneyTimeline.EVENT_ARRIVAL -> context.getString(R.string.scene_event_train_arrival)
                                    SceneOrchestrator.SOURCE_SUBMARINE_SONAR -> context.getString(R.string.scene_event_submarine_sonar)
                                    SceneOrchestrator.EVENT_HOOD_GUNSHOT -> context.getString(R.string.scene_event_hood_gunshot)
                                    SceneOrchestrator.EVENT_HOOD_SIREN -> context.getString(R.string.scene_event_hood_siren)
                                    SceneOrchestrator.EVENT_HOOD_GLASS -> context.getString(R.string.scene_event_hood_glass)
                                    SceneOrchestrator.EVENT_HOOD_SHOUT -> context.getString(R.string.scene_event_hood_shout)
                                    SceneOrchestrator.EVENT_HOOD_FOOTSTEPS -> context.getString(R.string.scene_event_hood_footsteps)
                                    SceneOrchestrator.EVENT_HOOD_CAR_PASS -> context.getString(R.string.scene_event_hood_car_pass)
                                    SceneOrchestrator.EVENT_HOOD_CAR_DOOR -> context.getString(R.string.scene_event_hood_car_door)
                                    SceneOrchestrator.EVENT_HOOD_HELICOPTER -> context.getString(R.string.scene_event_hood_helicopter)
                                    SceneOrchestrator.EVENT_HOOD_DOG -> context.getString(R.string.scene_event_hood_dog)
                                    SceneOrchestrator.EVENT_FOREST_TEMPLE_MOKTAK -> context.getString(R.string.scene_event_forest_temple_moktak)
                                    SceneOrchestrator.EVENT_FOREST_TEMPLE_GRAVEL -> context.getString(R.string.scene_event_forest_temple_gravel)
                                    SceneOrchestrator.EVENT_FOREST_TEMPLE_HEART_SUTRA -> context.getString(R.string.scene_event_forest_temple_heart_sutra)
                                    "${SceneOrchestrator.FERRY_JOURNEY}_departure", "${SceneOrchestrator.SPACECRAFT_JOURNEY}_departure", "${SceneOrchestrator.SUBMARINE_JOURNEY}_departure", "${SceneOrchestrator.HOOD_JOURNEY}_departure", "${SceneOrchestrator.FOREST_TEMPLE_JOURNEY}_departure" -> context.getString(R.string.scene_event_departure)
                                    "${SceneOrchestrator.FERRY_JOURNEY}_arrival", "${SceneOrchestrator.SPACECRAFT_JOURNEY}_arrival", "${SceneOrchestrator.SUBMARINE_JOURNEY}_arrival", "${SceneOrchestrator.HOOD_JOURNEY}_arrival", "${SceneOrchestrator.FOREST_TEMPLE_JOURNEY}_arrival" -> context.getString(R.string.scene_event_arrival)
                                    else -> eventId
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(context.getString(R.string.scene_random_events), style = MaterialTheme.typography.titleSmall)
                                Text(context.getString(R.string.scene_random_events_desc), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(checked = scene.randomEventsEnabled, onCheckedChange = viewModel::setSceneRandomEvents)
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
                            title = context.getString(sceneMacroRes(selectedSceneId, 0, false)),
                            subtitle = context.getString(sceneMacroRes(selectedSceneId, 0, true)),
                            value = scene.macros.enginePresence,
                            onValueChange = { viewModel.setSceneMacro(SceneOrchestrator.MACRO_ENGINE_PRESENCE, it) },
                        )
                        MacroSlider(
                            title = context.getString(sceneMacroRes(selectedSceneId, 1, false)),
                            subtitle = context.getString(sceneMacroRes(selectedSceneId, 1, true)),
                            value = scene.macros.cabinActivity,
                            onValueChange = { viewModel.setSceneMacro(SceneOrchestrator.MACRO_CABIN_ACTIVITY, it) },
                        )
                        MacroSlider(
                            title = context.getString(sceneMacroRes(selectedSceneId, 2, false)),
                            subtitle = context.getString(sceneMacroRes(selectedSceneId, 2, true)),
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
                            text = context.getString(sceneSpatialHintRes(selectedSceneId)),
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

private val JOURNEY_IDS = listOf(
    SceneOrchestrator.PASSENGER_AIRCRAFT,
    SceneOrchestrator.TRAIN_JOURNEY,
    SceneOrchestrator.SPACECRAFT_JOURNEY,
    SceneOrchestrator.FERRY_JOURNEY,
    SceneOrchestrator.SUBMARINE_JOURNEY,
    SceneOrchestrator.FOREST_TEMPLE_JOURNEY,
    SceneOrchestrator.HOOD_JOURNEY,
)

private fun sceneShortNameRes(id: String) = when (id) {
    SceneOrchestrator.TRAIN_JOURNEY -> R.string.scene_train_short_name
    SceneOrchestrator.FERRY_JOURNEY -> R.string.scene_ferry_short_name
    SceneOrchestrator.SPACECRAFT_JOURNEY -> R.string.scene_spacecraft_short_name
    SceneOrchestrator.SUBMARINE_JOURNEY -> R.string.scene_submarine_short_name
    SceneOrchestrator.HOOD_JOURNEY -> R.string.scene_hood_short_name
    SceneOrchestrator.FOREST_TEMPLE_JOURNEY -> R.string.scene_forest_temple_short_name
    else -> R.string.scene_aircraft_short_name
}

private fun sceneNameRes(id: String) = when (id) {
    SceneOrchestrator.TRAIN_JOURNEY -> R.string.scene_train_name
    SceneOrchestrator.FERRY_JOURNEY -> R.string.scene_ferry_name
    SceneOrchestrator.SPACECRAFT_JOURNEY -> R.string.scene_spacecraft_name
    SceneOrchestrator.SUBMARINE_JOURNEY -> R.string.scene_submarine_name
    SceneOrchestrator.HOOD_JOURNEY -> R.string.scene_hood_name
    SceneOrchestrator.FOREST_TEMPLE_JOURNEY -> R.string.scene_forest_temple_name
    else -> R.string.scene_aircraft_name
}

private fun sceneDescriptionRes(id: String) = when (id) {
    SceneOrchestrator.TRAIN_JOURNEY -> R.string.scene_train_description
    SceneOrchestrator.FERRY_JOURNEY -> R.string.scene_ferry_description
    SceneOrchestrator.SPACECRAFT_JOURNEY -> R.string.scene_spacecraft_description
    SceneOrchestrator.SUBMARINE_JOURNEY -> R.string.scene_submarine_description
    SceneOrchestrator.HOOD_JOURNEY -> R.string.scene_hood_description
    SceneOrchestrator.FOREST_TEMPLE_JOURNEY -> R.string.scene_forest_temple_description
    else -> R.string.scene_aircraft_description
}

private fun sceneUnavailableRes(id: String) = when (id) {
    SceneOrchestrator.TRAIN_JOURNEY -> R.string.scene_train_asset_unavailable
    SceneOrchestrator.FERRY_JOURNEY -> R.string.scene_ferry_asset_unavailable
    SceneOrchestrator.SPACECRAFT_JOURNEY -> R.string.scene_spacecraft_asset_unavailable
    SceneOrchestrator.SUBMARINE_JOURNEY -> R.string.scene_submarine_asset_unavailable
    SceneOrchestrator.HOOD_JOURNEY -> R.string.scene_hood_asset_unavailable
    SceneOrchestrator.FOREST_TEMPLE_JOURNEY -> R.string.scene_forest_temple_asset_unavailable
    else -> R.string.scene_asset_unavailable
}

private fun sceneSpatialHintRes(id: String) = when (id) {
    SceneOrchestrator.TRAIN_JOURNEY -> R.string.scene_train_spatial_hint
    SceneOrchestrator.FERRY_JOURNEY -> R.string.scene_ferry_spatial_hint
    SceneOrchestrator.SPACECRAFT_JOURNEY -> R.string.scene_spacecraft_spatial_hint
    SceneOrchestrator.SUBMARINE_JOURNEY -> R.string.scene_submarine_spatial_hint
    SceneOrchestrator.HOOD_JOURNEY -> R.string.scene_hood_spatial_hint
    SceneOrchestrator.FOREST_TEMPLE_JOURNEY -> R.string.scene_forest_temple_spatial_hint
    else -> R.string.scene_spatial_hint
}

private fun sceneMacroRes(id: String, index: Int, description: Boolean): Int {
    val pair = when (id) {
        SceneOrchestrator.TRAIN_JOURNEY -> listOf(
            R.string.macro_rail_rhythm to R.string.macro_rail_rhythm_desc,
            R.string.macro_carriage_activity to R.string.macro_carriage_activity_desc,
            R.string.macro_track_texture to R.string.macro_track_texture_desc,
        )
        SceneOrchestrator.FERRY_JOURNEY -> listOf(
            R.string.macro_ferry_engine to R.string.macro_ferry_engine_desc,
            R.string.macro_deck_activity to R.string.macro_deck_activity_desc,
            R.string.macro_wave_texture to R.string.macro_wave_texture_desc,
        )
        SceneOrchestrator.SPACECRAFT_JOURNEY -> listOf(
            R.string.macro_drive_presence to R.string.macro_drive_presence_desc,
            R.string.macro_spacecraft_activity to R.string.macro_spacecraft_activity_desc,
            R.string.macro_hull_texture to R.string.macro_hull_texture_desc,
        )
        SceneOrchestrator.SUBMARINE_JOURNEY -> listOf(
            R.string.macro_submarine_engine to R.string.macro_submarine_engine_desc,
            R.string.macro_crew_activity to R.string.macro_crew_activity_desc,
            R.string.macro_water_pressure to R.string.macro_water_pressure_desc,
        )
        SceneOrchestrator.HOOD_JOURNEY -> listOf(
            R.string.macro_street_presence to R.string.macro_street_presence_desc,
            R.string.macro_night_activity to R.string.macro_night_activity_desc,
            R.string.macro_incident_intensity to R.string.macro_incident_intensity_desc,
        )
        SceneOrchestrator.FOREST_TEMPLE_JOURNEY -> listOf(
            R.string.macro_forest_presence to R.string.macro_forest_presence_desc,
            R.string.macro_bird_activity to R.string.macro_bird_activity_desc,
            R.string.macro_temple_resonance to R.string.macro_temple_resonance_desc,
        )
        else -> listOf(
            R.string.macro_engine_presence to R.string.macro_engine_presence_desc,
            R.string.macro_cabin_activity to R.string.macro_cabin_activity_desc,
            R.string.macro_turbulence to R.string.macro_turbulence_desc,
        )
    }
    if (index == 3) return if (id == SceneOrchestrator.FOREST_TEMPLE_JOURNEY) {
        if (description) R.string.macro_meditation_depth_desc else R.string.macro_meditation_depth
    } else if (description) R.string.macro_night_depth_desc else R.string.macro_night_depth
    return if (description) pair[index].second else pair[index].first
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
    SceneOrchestrator.STATE_TRAIN_DEPARTURE -> context.getString(R.string.scene_state_train_departure)
    SceneOrchestrator.STATE_TRAIN_LEAVING_CITY -> context.getString(R.string.scene_state_train_leaving_city)
    SceneOrchestrator.STATE_TRAIN_NIGHT_RUN -> context.getString(R.string.scene_state_train_night_run)
    SceneOrchestrator.STATE_TRAIN_APPROACH -> context.getString(R.string.scene_state_train_approach)
    SceneOrchestrator.STATE_TRAIN_ARRIVAL -> context.getString(R.string.scene_state_train_arrival)
    SceneOrchestrator.STATE_FERRY_CAST_OFF -> context.getString(R.string.scene_state_ferry_cast_off)
    SceneOrchestrator.STATE_FERRY_LEAVING_HARBOR -> context.getString(R.string.scene_state_ferry_leaving_harbor)
    SceneOrchestrator.STATE_FERRY_NIGHT_CROSSING -> context.getString(R.string.scene_state_ferry_night_crossing)
    SceneOrchestrator.STATE_FERRY_HARBOR_APPROACH -> context.getString(R.string.scene_state_ferry_harbor_approach)
    SceneOrchestrator.STATE_FERRY_ARRIVAL -> context.getString(R.string.scene_state_ferry_arrival)
    SceneOrchestrator.STATE_SPACECRAFT_DEPARTURE -> context.getString(R.string.scene_state_spacecraft_departure)
    SceneOrchestrator.STATE_SPACECRAFT_ORBITAL_SETTLE -> context.getString(R.string.scene_state_spacecraft_orbital_settle)
    SceneOrchestrator.STATE_SPACECRAFT_DEEP_DRIFT -> context.getString(R.string.scene_state_spacecraft_deep_drift)
    SceneOrchestrator.STATE_SPACECRAFT_APPROACH -> context.getString(R.string.scene_state_spacecraft_approach)
    SceneOrchestrator.STATE_SPACECRAFT_DOCKING -> context.getString(R.string.scene_state_spacecraft_docking)
    SceneOrchestrator.STATE_SUBMARINE_DIVE -> context.getString(R.string.scene_state_submarine_dive)
    SceneOrchestrator.STATE_SUBMARINE_SETTLE -> context.getString(R.string.scene_state_submarine_settle)
    SceneOrchestrator.STATE_SUBMARINE_DEEP_CRUISE -> context.getString(R.string.scene_state_submarine_deep_cruise)
    SceneOrchestrator.STATE_SUBMARINE_ASCENT -> context.getString(R.string.scene_state_submarine_ascent)
    SceneOrchestrator.STATE_SUBMARINE_SURFACE -> context.getString(R.string.scene_state_submarine_surface)
    SceneOrchestrator.STATE_HOOD_SETTLING -> context.getString(R.string.scene_state_hood_settling)
    SceneOrchestrator.STATE_HOOD_AFTER_HOURS -> context.getString(R.string.scene_state_hood_after_hours)
    SceneOrchestrator.STATE_HOOD_DEEP_NIGHT -> context.getString(R.string.scene_state_hood_deep_night)
    SceneOrchestrator.STATE_HOOD_STREET_STIRRING -> context.getString(R.string.scene_state_hood_street_stirring)
    SceneOrchestrator.STATE_HOOD_FIRST_LIGHT -> context.getString(R.string.scene_state_hood_first_light)
    SceneOrchestrator.STATE_FOREST_TEMPLE_PATH -> context.getString(R.string.scene_state_forest_temple_path)
    SceneOrchestrator.STATE_FOREST_TEMPLE_COURTYARD -> context.getString(R.string.scene_state_forest_temple_courtyard)
    SceneOrchestrator.STATE_FOREST_TEMPLE_MEDITATION -> context.getString(R.string.scene_state_forest_temple_meditation)
    SceneOrchestrator.STATE_FOREST_TEMPLE_RETURN -> context.getString(R.string.scene_state_forest_temple_return)
    SceneOrchestrator.STATE_FOREST_TEMPLE_LEAVE -> context.getString(R.string.scene_state_forest_temple_leave)
    SceneOrchestrator.STATE_ARRIVED -> context.getString(R.string.scene_state_arrived)
    else -> context.getString(R.string.scene_state_cruise)
}
