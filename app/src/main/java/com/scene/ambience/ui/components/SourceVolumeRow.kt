package com.scene.ambience.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import com.scene.ambience.ui.components.SceneSlider as Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

/** One sound source: named on/off switch and a native volume slider. */
@Composable
fun SourceVolumeRow(
    name: String,
    volume: Float,
    muted: Boolean,
    enabled: Boolean,
    available: Boolean,
    unavailableText: String,
    onVolumeChangeFinished: (Float) -> Unit,
    modifier: Modifier = Modifier,
    accentColor: Color? = null,
) {
    var localVolume by remember { mutableFloatStateOf(volume) }
    var dragging by remember { mutableStateOf(false) }
    var lastVolume by remember { mutableFloatStateOf(volume.takeIf { it > 0f } ?: .5f) }
    LaunchedEffect(volume, dragging) {
        if (!dragging) localVolume = volume
        if (volume > 0f) lastVolume = volume
    }
    val active = enabled && volume > 0f && !muted
    val accent = accentColor ?: MaterialTheme.colorScheme.primary
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
            color = when { accentColor != null -> accent.copy(alpha = if (active) 1f else .72f); active -> accent; else -> MaterialTheme.colorScheme.outlineVariant },
        ),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleSmall,
                    color = accentColor ?: MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).padding(end = 12.dp),
                )
                Text(
                    text = "${(localVolume * 100).roundToInt()}%",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (active || accentColor != null) accent else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Switch(
                    checked = active,
                    onCheckedChange = { onVolumeChangeFinished(if (it) lastVolume else 0f) },
                    enabled = available,
                    modifier = Modifier.padding(start = 12.dp).semantics { contentDescription = name },
                    colors = SwitchDefaults.colors(checkedTrackColor = accent),
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
                modifier = Modifier.fillMaxWidth().height(48.dp).semantics { contentDescription = name },
                colors = SliderDefaults.colors(
                    activeTrackColor = accent,
                    thumbColor = accent,
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
