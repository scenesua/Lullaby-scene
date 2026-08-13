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
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Train
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.SliderDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import android.util.Log
import com.scene.ambience.R
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.data.model.SourceCatalog
import com.scene.ambience.data.model.SourceDefinition
import com.scene.ambience.data.model.SourceId
import com.scene.ambience.data.model.UiCategory
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel
import com.scene.ambience.ui.AmbienceStrings
import com.scene.ambience.ui.components.SourceVolumeRow

@Composable
fun MixerScreen(
    state: AmbienceUiState,
    viewModel: AmbienceViewModel,
    modifier: Modifier = Modifier,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val snapshot = state.snapshot
    val playing = snapshot?.playbackState == PlaybackState.PLAYING
    val availableIds = state.library.sources.map { it.id }.toSet()

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item(key = "master") {
            MasterControls(
                volume = snapshot?.masterVolume ?: 0.8f,
                muted = snapshot?.masterMuted ?: false,
                playing = playing,
                enabled = (snapshot?.activeSourceCount ?: 0) > 0,
                onVolume = viewModel::setMasterVolume,
                onMute = { viewModel.setMasterMuted(!mutedOr(snapshot?.masterMuted)) },
                onTogglePlayPause = viewModel::togglePlayPause,
                onStop = viewModel::stop,
            )
        }

        item(key = "active") {
            val active = snapshot?.activeSourceCount ?: 0
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                Text(
                    text = context.getString(R.string.sources_title, active),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                TextButton(
                    onClick = viewModel::disableAllSources,
                    enabled = active > 0,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Refresh,
                        contentDescription = context.getString(R.string.action_disable_all),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(context.getString(R.string.action_disable_all_short))
                }
            }
        }

        UiCategory.entries.forEach { category ->
            val defs = SourceCatalog.all.filter { it.uiCategory == category }
            item(key = "header_${category.id}") {
                val collapsed = state.expandedCategories.contains(category.id)
                CategoryHeader(
                    category = category,
                    expanded = !collapsed,
                    onToggle = { viewModel.toggleCategoryExpanded(category.id) },
                )
            }
            if (!state.expandedCategories.contains(category.id)) {
                items(defs, key = { it.sourceId.id }) { def ->
                    SourceRow(
                        def = def,
                        snapshot = snapshot,
                        available = def.sourceId.id in availableIds,
                        unavailableText = context.getString(R.string.source_not_available),
                        viewModel = viewModel,
                    )
                }
            }
        }
    }
}

private fun mutedOr(muted: Boolean?): Boolean = muted ?: false

@Composable
private fun MasterControls(
    volume: Float,
    muted: Boolean,
    playing: Boolean,
    enabled: Boolean,
    onVolume: (Float) -> Unit,
    onMute: () -> Unit,
    onTogglePlayPause: () -> Unit,
    onStop: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val darkTheme = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val panelColor = if (darkTheme) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.inverseSurface
    val panelContentColor = if (darkTheme) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.inverseOnSurface
    val panelAccentColor = if (darkTheme) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.inversePrimary
    Surface(
        shape = MaterialTheme.shapes.large,
        color = panelColor,
        contentColor = panelContentColor,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = context.getString(R.string.master_volume), style = MaterialTheme.typography.titleLarge)
                    Text(
                        text = "${(volume * 100).toInt()}%",
                        style = MaterialTheme.typography.labelMedium,
                        color = panelAccentColor,
                    )
                }
                IconButton(onClick = onMute, enabled = enabled) {
                    Icon(
                        imageVector = if (muted) Icons.Filled.VolumeOff else Icons.Filled.VolumeUp,
                        contentDescription = context.getString(if (muted) R.string.action_unmute else R.string.action_mute),
                        tint = panelContentColor,
                    )
                }
                FilledIconButton(onClick = onTogglePlayPause, enabled = enabled) {
                    Icon(
                        imageVector = if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = context.getString(if (playing) R.string.action_pause else R.string.action_play),
                    )
                }
            }
            Slider(
                value = volume,
                onValueChange = onVolume,
                enabled = true,
                modifier = Modifier.fillMaxWidth(),
                colors = SliderDefaults.colors(
                    thumbColor = panelAccentColor,
                    activeTrackColor = panelAccentColor,
                    inactiveTrackColor = panelContentColor.copy(alpha = 0.22f),
                ),
            )
            if (!enabled) {
                Text(
                    text = context.getString(R.string.no_active_sources_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = panelContentColor.copy(alpha = 0.68f),
                )
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    AssistChip(
                        onClick = onStop,
                        label = { Text(context.getString(R.string.action_stop)) },
                        leadingIcon = { Icon(Icons.Filled.Stop, contentDescription = null) },
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryHeader(
    category: UiCategory,
    expanded: Boolean,
    onToggle: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = when (category) {
                UiCategory.NATURE -> Icons.Filled.Landscape
                UiCategory.INDOOR -> Icons.Filled.Home
                UiCategory.TRAVEL -> Icons.Filled.Train
                UiCategory.OTHER -> Icons.Filled.MoreHoriz
            },
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.width(20.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = AmbienceStrings.categoryName(context, category),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.weight(1f),
        )
        IconButton(onClick = onToggle) {
            Icon(
                imageVector = if (expanded) Icons.Filled.ArrowDropDown else Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
            )
        }
    }
}

@Composable
private fun SourceRow(
    def: SourceDefinition,
    snapshot: com.scene.ambience.data.model.EngineSnapshot?,
    available: Boolean,
    unavailableText: String,
    viewModel: AmbienceViewModel,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val sourceState = snapshot?.sources?.get(def.sourceId.id)
    val enabled = sourceState?.enabled ?: false
    val volume = sourceState?.volume ?: 0f
    val muted = sourceState?.muted ?: false

    SourceVolumeRow(
        name = AmbienceStrings.sourceName(context, def.sourceId.id),
        volume = volume,
        muted = muted,
        enabled = enabled,
        available = available,
        unavailableText = unavailableText,
        onVolumeChangeFinished = {
            Log.d("AmbiencePlayback", "SliderInput source=${def.sourceId.id} value=$it")
            viewModel.setSourceVolume(def.sourceId.id, it)
        },
        onToggleMuted = { viewModel.setSourceMuted(def.sourceId.id, !muted) },
    )
}
