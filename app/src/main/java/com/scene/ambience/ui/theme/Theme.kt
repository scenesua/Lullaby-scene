package com.scene.ambience.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import com.scene.ambience.data.model.ThemeMode

private val LightColors = lightColorScheme(
    primary = Color(0xFFD2A000),
    onPrimary = Color(0xFF191607),
    primaryContainer = Color(0xFFFFE48C),
    onPrimaryContainer = Color(0xFF241D00),
    secondary = Color(0xFF625E52),
    onSecondary = Color.White,
    background = Color(0xFFF8F6F0),
    onBackground = Color(0xFF1C1B18),
    surface = Color(0xFFFFFDF7),
    onSurface = Color(0xFF1C1B18),
    surfaceVariant = Color(0xFFEDE9DE),
    onSurfaceVariant = Color(0xFF4D493F),
    outline = Color(0xFF7D776B),
    outlineVariant = Color(0xFFD0C8B8),
    inverseSurface = Color(0xFF1B1A17),
    inverseOnSurface = Color(0xFFF6F2E9),
    inversePrimary = Color(0xFFFFD447),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFFFD447),
    onPrimary = Color(0xFF211B00),
    primaryContainer = Color(0xFF4D3D00),
    onPrimaryContainer = Color(0xFFFFE48C),
    secondary = Color(0xFFCBC4B4),
    onSecondary = Color(0xFF332F26),
    background = Color(0xFF0F0F0D),
    onBackground = Color(0xFFE9E5DC),
    surface = Color(0xFF171714),
    onSurface = Color(0xFFE9E5DC),
    surfaceVariant = Color(0xFF292720),
    onSurfaceVariant = Color(0xFFD0C8B8),
    outline = Color(0xFF999183),
    outlineVariant = Color(0xFF49453C),
    inverseSurface = Color(0xFFE9E5DC),
    inverseOnSurface = Color(0xFF1B1A17),
    inversePrimary = Color(0xFFD2A000),
)

private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(30.dp),
)

private val AppTypography = Typography().let { base ->
    base.copy(
        headlineSmall = base.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
        titleLarge = base.titleLarge.copy(fontWeight = FontWeight.SemiBold),
        titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold),
        titleSmall = base.titleSmall.copy(fontWeight = FontWeight.SemiBold),
        labelLarge = base.labelLarge.copy(fontWeight = FontWeight.SemiBold),
    )
}

@Composable
fun AmbienceTheme(
    mode: ThemeMode = ThemeMode.SYSTEM,
    content: @Composable () -> Unit,
) {
    val dark = when (mode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content,
    )
}
