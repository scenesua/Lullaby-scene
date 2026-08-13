package com.scene.ambience.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.Surface
import androidx.compose.material3.SliderDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

/** One sound source: name, volume slider, mute toggle. */
@Composable
fun SourceVolumeRow(
    name: String,
    volume: Float,
    muted: Boolean,
    enabled: Boolean,
    available: Boolean,
    unavailableText: String,
    onVolumeChangeFinished: (Float) -> Unit,
    onToggleMuted: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var localVolume by remember { mutableFloatStateOf(volume) }
    var dragging by remember { mutableStateOf(false) }
    LaunchedEffect(volume, dragging) {
        if (!dragging) localVolume = volume
    }
    val active = enabled && volume > 0f && !muted
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = if (available) {
            if (active) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.28f)
                    .compositeOver(MaterialTheme.colorScheme.surface)
            } else {
                MaterialTheme.colorScheme.surface
            }
        } else {
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        },
        border = BorderStroke(
            width = 1.dp,
            color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
        ),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                FilledTonalIconButton(
                    onClick = onToggleMuted,
                    enabled = available && enabled,
                    modifier = Modifier.width(40.dp).height(40.dp),
                ) {
                    Icon(
                        imageVector = if (muted) Icons.Filled.VolumeOff else Icons.Filled.VolumeUp,
                        contentDescription = null,
                        tint = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(start = 10.dp).weight(1f),
                )
                ActiveDot(active)
                Text(
                    text = "${(localVolume * 100).roundToInt()}%",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Slider(
                value = localVolume,
                onValueChange = {
                    dragging = true
                    localVolume = it
                },
                onValueChangeFinished = {
                    dragging = false
                    onVolumeChangeFinished(localVolume)
                },
                enabled = available,
                modifier = Modifier.fillMaxWidth().height(36.dp),
                colors = SliderDefaults.colors(
                    activeTrackColor = MaterialTheme.colorScheme.primary,
                    thumbColor = MaterialTheme.colorScheme.primary,
                    inactiveTrackColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
            )
            if (!available) {
                Text(
                    text = unavailableText,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
        }
    }
}

/** Active-source indicator dot used next to source names. */
@Composable
fun ActiveDot(active: Boolean, modifier: Modifier = Modifier) {
    if (active) {
        Row(
            modifier = modifier.padding(end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.width(8.dp).height(8.dp),
                shape = RoundedCornerShape(4.dp),
                color = MaterialTheme.colorScheme.primary,
            ) {}
        }
    }
}
