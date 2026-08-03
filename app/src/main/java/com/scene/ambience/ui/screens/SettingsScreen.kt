package com.scene.ambience.ui.screens

import android.content.Context
import android.media.AudioManager
import android.util.Log
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.scene.ambience.R
import com.scene.ambience.data.model.EqSettings
import com.scene.ambience.data.model.FocusPolicy
import com.scene.ambience.data.model.ThemeMode
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.presentation.AmbienceViewModel
import kotlin.math.roundToInt

@Composable
fun SettingsScreen(
    state: AmbienceUiState,
    viewModel: AmbienceViewModel,
    onOpenLicenses: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var showEqDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionTitle(context.getString(R.string.settings_appearance))
            RadioSetting(
                title = context.getString(R.string.theme),
                options = listOf(
                    context.getString(R.string.theme_system) to ThemeMode.SYSTEM,
                    context.getString(R.string.theme_light) to ThemeMode.LIGHT,
                    context.getString(R.string.theme_dark) to ThemeMode.DARK,
                ),
                selected = state.themeMode,
                onSelect = viewModel::setThemeMode,
            )
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_playback))
            RadioSetting(
                title = context.getString(R.string.focus),
                options = listOf(
                    context.getString(R.string.focus_pause) to FocusPolicy.PAUSE,
                    context.getString(R.string.focus_duck) to FocusPolicy.DUCK,
                    context.getString(R.string.focus_continue) to FocusPolicy.CONTINUE,
                ),
                selected = state.focusPolicy,
                onSelect = viewModel::setFocusPolicy,
            )
            SwitchSetting(
                title = context.getString(R.string.restore_mix),
                subtitle = context.getString(R.string.restore_mix_desc),
                checked = state.restoreLastMix,
                onCheckedChange = viewModel::setRestoreLastMix,
            )
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_timer))
            Card {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(context.getString(R.string.default_minutes))
                    Slider(
                        value = state.timerDefaultMinutes.toFloat(),
                        onValueChange = { viewModel.setTimerDefaults(it.toInt(), state.timerFadeSeconds) },
                        valueRange = 5f..180f,
                        steps = 34,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = context.getString(R.string.timer_minutes, state.timerDefaultMinutes),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(context.getString(R.string.fade_seconds))
                    Slider(
                        value = state.timerFadeSeconds.toFloat(),
                        onValueChange = { viewModel.setTimerDefaults(state.timerDefaultMinutes, it.toInt()) },
                        valueRange = 0f..120f,
                        steps = 23,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = context.getString(R.string.timer_fade_hint, state.timerFadeSeconds),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                    )
                }
            }
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_eq))
            Card(onClick = { showEqDialog = true }, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(context.getString(R.string.settings_eq), style = MaterialTheme.typography.bodyLarge)
                        Text(
                            text = context.getString(R.string.settings_eq_desc),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline,
                        )
                    }
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.outline,
                    )
                    Spacer(Modifier.width(4.dp))
                    Switch(
                        checked = state.eqSettings.enabled,
                        onCheckedChange = { enabled ->
                            viewModel.setEqualizer(enabled, state.eqSettings.presetName, state.eqSettings.bands)
                        },
                    )
                }
            }
        }

        item {
            HorizontalDivider()
            SectionTitle(context.getString(R.string.settings_about))
            Card(onClick = onOpenLicenses, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = context.getString(R.string.licenses),
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                    )
                }
            }
        }
    }

    if (showEqDialog) {
        EqDialog(
            initial = state.eqSettings,
            onApply = { eq -> viewModel.setEqualizer(eq.enabled, eq.presetName, eq.bands) },
            onDismiss = { showEqDialog = false },
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(vertical = 4.dp),
    )
}

@Composable
private fun <T> RadioSetting(
    title: String,
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            options.forEach { (label, value) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(
                        selected = value == selected,
                        onClick = { onSelect(value) },
                    )
                    Text(label, modifier = Modifier.padding(start = 8.dp))
                }
            }
        }
    }
}

@Composable
private fun SwitchSetting(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.bodyLarge)
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}

private data class EqBand(val minHz: Int, val maxHz: Int) {
    val label: String
        get() {
            val hz = (minHz + maxHz) / 2
            if (hz < 1000) return hz.toString()
            val k = hz / 1000.0
            return if (k >= 10) "${k.roundToInt()}k" else "${(k * 10).roundToInt() / 10.0}k"
        }
}

private data class EqProbe(val bands: List<EqBand>, val minLevel: Int, val maxLevel: Int)

private fun loadEqProbe(context: Context): EqProbe? {
    // Session 0 ("global output mix") is not a portable way to probe effect capabilities —
    // several OEM audio stacks (custom effect chains, Samsung UHQ upscaler, etc.) reject
    // third-party AudioEffect creation on it. Band count/level range/frequencies are static
    // properties of the effect itself, so a throwaway *real* session id works everywhere.
    val sessionId = runCatching {
        context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }.getOrNull()?.generateAudioSessionId()
    if (sessionId == null || sessionId == AudioManager.ERROR) {
        Log.w(TAG_EQ, "loadEqProbe: could not generate an audio session id")
        return null
    }
    val eq = runCatching { android.media.audiofx.Equalizer(0, sessionId) }
        .onFailure { Log.w(TAG_EQ, "loadEqProbe: Equalizer unavailable on this device", it) }
        .getOrNull() ?: return null
    val range = eq.bandLevelRange
    val bandCount = eq.numberOfBands.toInt()
    if (bandCount == 0) {
        Log.w(TAG_EQ, "loadEqProbe: device reports 0 bands")
        eq.release()
        return null
    }
    val bands = (0 until bandCount).map { index ->
        val freq = eq.getBandFreqRange(index.toShort())
        EqBand(freq[0] / 1000, freq[1] / 1000)
    }
    eq.release()
    return EqProbe(bands, range[0].toInt(), range[1].toInt())
}

private const val TAG_EQ = "AmbienceEqProbe"

private val EQ_PRESET_KEYS = listOf("flat", "reduce_lows", "reduce_highs", "reduce_both")

private fun presetLabel(context: Context, key: String): String = when (key) {
    "flat" -> context.getString(R.string.eq_preset_flat)
    "reduce_lows" -> context.getString(R.string.eq_preset_reduce_lows)
    "reduce_highs" -> context.getString(R.string.eq_preset_reduce_highs)
    else -> context.getString(R.string.eq_preset_reduce_both)
}

private fun presetLevels(probe: EqProbe, key: String): List<Int> =
    probe.bands.map { band ->
        when (key) {
            "reduce_lows" -> if (band.maxHz <= 300) probe.minLevel else 0
            "reduce_highs" -> if (band.minHz >= 2500) probe.minLevel else 0
            "reduce_both" -> if (band.maxHz <= 300 || band.minHz >= 2500) probe.minLevel else 0
            else -> 0
        }
    }

private fun resizeBands(bands: List<Int>, size: Int): List<Int> =
    List(size) { index -> bands.getOrElse(index) { 0 } }

@Composable
private fun EqDialog(
    initial: EqSettings,
    onApply: (EqSettings) -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val probe = remember { loadEqProbe(context) }
    if (probe == null) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text(context.getString(R.string.settings_eq)) },
            text = { Text(context.getString(R.string.settings_eq_unsupported)) },
            confirmButton = {
                TextButton(onClick = onDismiss) { Text(context.getString(R.string.eq_close)) }
            },
        )
        return
    }

    var preset by remember(initial) {
        mutableStateOf(initial.presetName.takeIf { it in EQ_PRESET_KEYS } ?: "")
    }
    var levels by remember(initial) { mutableStateOf(resizeBands(initial.bands, probe.bands.size)) }

    fun apply(newPreset: String, newLevels: List<Int>) {
        preset = newPreset
        levels = newLevels
        onApply(EqSettings(enabled = true, presetName = newPreset, bands = newLevels))
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(context.getString(R.string.settings_eq)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(context.getString(R.string.eq_preset_section), style = MaterialTheme.typography.labelLarge)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    EQ_PRESET_KEYS.forEach { key ->
                        FilterChip(
                            selected = preset == key,
                            onClick = { apply(key, presetLevels(probe, key)) },
                            label = { Text(presetLabel(context, key)) },
                        )
                    }
                }
                Text(context.getString(R.string.eq_band_section), style = MaterialTheme.typography.labelLarge)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    probe.bands.forEachIndexed { index, band ->
                        BandSlider(
                            label = band.label,
                            value = levels.getOrElse(index) { 0 },
                            minLevel = probe.minLevel,
                            maxLevel = probe.maxLevel,
                            onValueChange = { value ->
                                val newLevels = levels.toMutableList().also { list ->
                                    while (list.size <= index) list.add(0)
                                    list[index] = value
                                }
                                apply("custom", newLevels)
                            },
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text(context.getString(R.string.eq_close)) }
        },
    )
}

@Composable
private fun BandSlider(
    label: String,
    value: Int,
    minLevel: Int,
    maxLevel: Int,
    onValueChange: (Int) -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(44.dp),
    ) {
        Box(
            modifier = Modifier.size(width = 44.dp, height = 150.dp),
            contentAlignment = Alignment.Center,
        ) {
            Slider(
                value = value.toFloat().coerceIn(minLevel.toFloat(), maxLevel.toFloat()),
                onValueChange = { onValueChange(it.roundToInt()) },
                valueRange = minLevel.toFloat()..maxLevel.toFloat(),
                modifier = Modifier
                    .size(width = 150.dp, height = 44.dp)
                    .rotate(-90f),
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline,
        )
    }
}
