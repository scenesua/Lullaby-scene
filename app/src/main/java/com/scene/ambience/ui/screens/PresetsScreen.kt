package com.scene.ambience.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.scene.ambience.R
import com.scene.ambience.data.model.AmbiencePreset
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel

@Composable
fun PresetsScreen(
    state: AmbienceUiState,
    viewModel: AmbienceViewModel,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var showSaveDialog by remember { mutableStateOf(false) }
    var defaultExpanded by rememberSaveable { mutableStateOf(true) }
    var customExpanded by rememberSaveable { mutableStateOf(true) }

    Box(modifier = modifier.fillMaxSize()) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(context.getString(R.string.scene_recipe_share_title), style = MaterialTheme.typography.titleMedium)
                            Text(
                                context.getString(R.string.scene_recipe_share_desc),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        OutlinedButton(
                            onClick = {
                                val hasAudibleSource = state.snapshot?.sources?.values?.any { it.audible } == true
                                val url = if (hasAudibleSource) viewModel.currentSceneShareUrl() else null
                                if (url == null) {
                                    Toast.makeText(context, R.string.scene_recipe_share_unavailable, Toast.LENGTH_SHORT).show()
                                } else {
                                    val share = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, url)
                                    }
                                    context.startActivity(Intent.createChooser(share, context.getString(R.string.scene_recipe_share_chooser)))
                                }
                            },
                        ) {
                            Icon(Icons.Filled.Share, contentDescription = null)
                            Text(context.getString(R.string.scene_recipe_share), modifier = Modifier.padding(start = 6.dp))
                        }
                    }
                }
            }

            item(span = { GridItemSpan(maxLineSpan) }) {
                SectionHeader(
                    title = context.getString(R.string.preset_section_default),
                    count = state.builtInPresets.size,
                    expanded = defaultExpanded,
                    onClick = { defaultExpanded = !defaultExpanded },
                )
            }
            if (defaultExpanded) {
                items(state.builtInPresets, key = { it.id }) { preset ->
                    PresetCard(
                        preset = preset,
                        isUser = false,
                        active = state.snapshot?.activePresetId == preset.id,
                        onApply = { viewModel.applyPreset(preset) },
                        onRename = {},
                        onDelete = {},
                    )
                }
            }

            item(span = { GridItemSpan(maxLineSpan) }) {
                SectionHeader(
                    title = context.getString(R.string.preset_section_custom),
                    count = state.userPresets.size,
                    expanded = customExpanded,
                    onClick = { customExpanded = !customExpanded },
                )
            }
            if (customExpanded) {
                if (state.userPresets.isEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Text(
                            text = context.getString(R.string.preset_section_empty_custom),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.padding(vertical = 8.dp),
                        )
                    }
                } else {
                    items(state.userPresets, key = { it.id }) { preset ->
                        PresetCard(
                            preset = preset,
                            isUser = true,
                            active = state.snapshot?.activePresetId == preset.id,
                            onApply = { viewModel.applyPreset(preset) },
                            onRename = { newName -> viewModel.renamePreset(preset.id, newName) },
                            onDelete = { viewModel.deletePreset(preset.id) },
                        )
                    }
                }
            }
        }

        ExtendedFloatingActionButton(
            onClick = { showSaveDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(24.dp),
            icon = { Icon(Icons.Filled.Add, contentDescription = null) },
            text = { Text(context.getString(R.string.save_current_mix)) },
        )
    }

    if (showSaveDialog) {
        SavePresetDialog(
            onDismiss = { showSaveDialog = false },
            onSave = { name ->
                showSaveDialog = false
                viewModel.saveCurrentMixAsPreset(name)
            },
        )
    }
}

@Composable
private fun SectionHeader(
    title: String,
    count: Int,
    expanded: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = "($count)",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.outline,
        )
        Icon(
            imageVector = if (expanded) Icons.Filled.KeyboardArrowDown else Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
        )
    }
}

@Composable
private fun PresetCard(
    preset: AmbiencePreset,
    isUser: Boolean,
    active: Boolean,
    onApply: () -> Unit,
    onRename: (String) -> Unit,
    onDelete: () -> Unit,
) {
    val context = LocalContext.current
    var showRenameDialog by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }

    Card(onClick = onApply, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (isUser) preset.name else context.getString(stringResFor(preset.id)),
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                if (isUser) {
                    IconButton(onClick = { menuOpen = true }) {
                        Icon(Icons.Filled.Edit, contentDescription = null)
                    }
                    DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                        DropdownMenuItem(
                            text = { Text(context.getString(R.string.rename)) },
                            onClick = { menuOpen = false; showRenameDialog = true },
                        )
                        DropdownMenuItem(
                            text = { Text(context.getString(R.string.delete)) },
                            onClick = { menuOpen = false; onDelete() },
                        )
                    }
                }
            }
            Text(
                text = context.getString(R.string.preset_sources_count, preset.mix.sources.count { it.value.enabled }),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
            )
        }
    }

    if (showRenameDialog) {
        NameDialog(
            title = context.getString(R.string.rename),
            initial = if (isUser) preset.name else "",
            onDismiss = { showRenameDialog = false },
            onConfirm = { showRenameDialog = false; onRename(it) },
        )
    }
}

private fun stringResFor(id: String): Int = when (id) {
    "preset_rain_eaves" -> R.string.preset_rain_eaves
    "preset_rainy_cafe" -> R.string.preset_rainy_cafe
    "preset_forest_night" -> R.string.preset_forest_night
    "preset_beach" -> R.string.preset_beach
    "preset_cozy_fireplace" -> R.string.preset_cozy_fireplace
    "preset_train_journey" -> R.string.preset_train_journey
    "preset_city_night" -> R.string.preset_city_night
    "preset_thunderstorm" -> R.string.preset_thunderstorm
    "preset_forest_morning" -> R.string.preset_forest_morning
    "preset_bamboo_meditation" -> R.string.preset_bamboo_meditation
    "preset_deep_focus" -> R.string.preset_deep_focus
    "preset_quiet_night" -> R.string.preset_quiet_night
    "preset_morning_birds" -> R.string.preset_morning_birds
    "preset_ocean_waves" -> R.string.preset_ocean_waves
    "preset_rainy_night" -> R.string.preset_rainy_night
    "preset_fan_room" -> R.string.preset_fan_room
    "preset_cafe_focus" -> R.string.preset_cafe_focus
    "preset_simple_aircraft" -> R.string.preset_simple_aircraft
    "preset_simple_train" -> R.string.preset_simple_train
    "preset_simple_ferry" -> R.string.preset_simple_ferry
    "preset_simple_spacecraft" -> R.string.preset_simple_spacecraft
    "preset_simple_submarine" -> R.string.preset_simple_submarine
    "preset_winter_lighthouse" -> R.string.preset_winter_lighthouse
    "preset_harbor_cabin" -> R.string.preset_harbor_cabin
    "preset_polar_night_train" -> R.string.preset_polar_night_train
    else -> R.string.preset_rainy_cafe
}

@Composable
fun SavePresetDialog(onDismiss: () -> Unit, onSave: (String) -> Unit) {
    val context = LocalContext.current
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(context.getString(R.string.save_current_mix)) },
        text = { OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text(context.getString(R.string.preset_name_hint)) }, singleLine = true) },
        confirmButton = { TextButton(onClick = { onSave(name) }, enabled = name.isNotBlank()) { Text(context.getString(R.string.save)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(context.getString(R.string.cancel)) } },
    )
}

@Composable
fun NameDialog(title: String, initial: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    val context = LocalContext.current
    var name by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { OutlinedTextField(value = name, onValueChange = { name = it }, singleLine = true) },
        confirmButton = { TextButton(onClick = { onConfirm(name) }, enabled = name.isNotBlank()) { Text(context.getString(R.string.save)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(context.getString(R.string.cancel)) } },
    )
}
