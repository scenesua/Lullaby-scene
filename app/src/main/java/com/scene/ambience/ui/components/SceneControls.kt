package com.scene.ambience.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/** Material's gestures, keyboard and accessibility; only the visual slots differ. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SceneSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    valueRange: ClosedFloatingPointRange<Float> = 0f..1f,
    steps: Int = 0,
    onValueChangeFinished: (() -> Unit)? = null,
    colors: SliderColors = SliderDefaults.colors(),
) {
    Slider(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.heightIn(min = 48.dp),
        enabled = enabled,
        valueRange = valueRange,
        steps = steps,
        onValueChangeFinished = onValueChangeFinished,
        colors = colors,
        thumb = {
            Box(
                Modifier.size(28.dp).alpha(if (enabled) 1f else .45f)
                    .shadow(3.dp, CircleShape)
                    .background(Brush.linearGradient(listOf(Color.White, Color(0xFFA3AAB3))), CircleShape)
                    .padding(3.dp)
                    .background(Brush.linearGradient(listOf(Color(0xFF979FA9), Color(0xFFE4E5E3), Color.White)), CircleShape)
                    .border(1.dp, Color.Black.copy(alpha = .15f), CircleShape),
            )
        },
        track = {
            Box(
                Modifier.fillMaxWidth().height(26.dp).clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .84f))
                    .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .16f), Color.Transparent, Color.Black.copy(alpha = .12f))))
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .65f), CircleShape),
            )
        },
    )
}

@Composable
fun SceneActionButton(
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    primary: Boolean = false,
    enabled: Boolean = true,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 64.dp).alpha(if (enabled) 1f else .45f),
        shape = RoundedCornerShape(16.dp),
        color = if (primary) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        contentColor = if (primary) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            Modifier.background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .08f), Color.Transparent))).padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(22.dp))
            Text(label, style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center)
        }
    }
}
