package com.scene.ambience.ui.components

import androidx.compose.foundation.background
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.Surface
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

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
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = if (available) {
            MaterialTheme.colorScheme.surfaceVariant
        } else {
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            IconButton(
                onClick = onToggleMuted,
                enabled = available && enabled,
                modifier = Modifier.width(36.dp).height(36.dp),
            ) {
                Icon(
                    imageVector = if (muted) Icons.Filled.VolumeOff else Icons.Filled.VolumeUp,
                    contentDescription = null,
                    tint = if (muted) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.primary,
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
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
                    modifier = Modifier.fillMaxWidth(),
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
