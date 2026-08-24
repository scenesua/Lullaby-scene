package com.scene.ambience.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import android.graphics.BitmapFactory
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.scene.ambience.R
import com.scene.ambience.media.SceneOrchestrator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun SceneDisplayDialog(
    sceneId: String?,
    presetId: String?,
    playing: Boolean,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val assetPath = visualAsset(sceneId, presetId)
    val image by produceState<ImageBitmap?>(null, assetPath) {
        value = withContext(Dispatchers.IO) {
            runCatching {
                context.assets.open(assetPath).use { stream -> BitmapFactory.decodeStream(stream)?.asImageBitmap() }
            }.getOrNull()
        }
    }
    val transition = rememberInfiniteTransition(label = "scene-light")
    val animatedLight by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 6_000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scene-light-level",
    )
    val light = if (playing) animatedLight else 0.3f
    val activity = context.findActivity()

    DisposableEffect(activity) {
        val previousOrientation = activity?.requestedOrientation
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        activity?.window?.let { window ->
            WindowCompat.getInsetsController(window, window.decorView).hide(WindowInsetsCompat.Type.systemBars())
        }
        onDispose {
            activity?.window?.let { window ->
                WindowCompat.getInsetsController(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
            }
            if (previousOrientation != null) activity.requestedOrientation = previousOrientation
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Box(Modifier.fillMaxSize().background(Color(0xFF05070B))) {
            image?.let { bitmap ->
                Image(
                    bitmap = bitmap,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    colorFilter = brightnessFilter(0.82f + light * 0.24f),
                    modifier = Modifier.fillMaxSize(),
                )
                Image(
                    bitmap = bitmap,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    colorFilter = brightnessFilter(1.22f),
                    modifier = Modifier
                        .fillMaxSize()
                        .scale(1.04f)
                        .blur(28.dp)
                        .alpha(0.08f + light * 0.22f),
                )
            } ?: Text(
                text = context.getString(R.string.scene_display_unavailable),
                color = Color.White,
                modifier = Modifier.align(Alignment.Center),
            )
            FilledTonalButton(
                onClick = onDismiss,
                modifier = Modifier.align(Alignment.BottomCenter).padding(24.dp),
            ) {
                Text(context.getString(R.string.scene_display_close))
            }
        }
    }
}

private fun brightnessFilter(scale: Float): ColorFilter = ColorFilter.colorMatrix(
    ColorMatrix().apply { setToScale(scale, scale, scale, 1f) }
)

private fun visualAsset(sceneId: String?, presetId: String?): String {
    val journey = when (sceneId) {
        SceneOrchestrator.TRAIN_JOURNEY -> "train"
        SceneOrchestrator.FERRY_JOURNEY -> "ferry"
        SceneOrchestrator.SPACECRAFT_JOURNEY -> "spacecraft"
        SceneOrchestrator.SUBMARINE_JOURNEY -> "submarine"
        SceneOrchestrator.PASSENGER_AIRCRAFT -> "aircraft"
        else -> null
    }
    if (journey != null) return "visuals/journeys/$journey.webp"
    return when (presetId) {
        "preset_rainy_cafe", "preset_cafe_focus" -> "visuals/simple-scenes/rainy-cafe.webp"
        "preset_forest_night", "preset_quiet_night" -> "visuals/simple-scenes/forest-night.webp"
        "preset_beach", "preset_ocean_waves" -> "visuals/simple-scenes/ocean-night.webp"
        "preset_cozy_fireplace" -> "visuals/simple-scenes/cozy-fireplace.webp"
        "preset_city_night" -> "visuals/simple-scenes/city-night.webp"
        "preset_thunderstorm", "preset_rainy_night" -> "visuals/simple-scenes/thunderstorm.webp"
        "preset_forest_morning", "preset_morning_birds" -> "visuals/simple-scenes/forest-morning.webp"
        "preset_bamboo_meditation" -> "visuals/simple-scenes/bamboo-meditation.webp"
        "preset_deep_focus" -> "visuals/simple-scenes/deep-focus.webp"
        "preset_fan_room" -> "visuals/simple-scenes/fan-room.webp"
        "preset_winter_lighthouse" -> "visuals/simple-scenes/winter-lighthouse.webp"
        "preset_train_journey", "preset_simple_train", "preset_polar_night_train" -> "visuals/journeys/train.webp"
        "preset_simple_ferry", "preset_harbor_cabin" -> "visuals/journeys/ferry.webp"
        "preset_simple_spacecraft" -> "visuals/journeys/spacecraft.webp"
        "preset_simple_submarine" -> "visuals/journeys/submarine.webp"
        else -> "visuals/journeys/aircraft.webp"
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
