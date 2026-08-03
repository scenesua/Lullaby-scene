package com.scene.ambience.ui.screens

import android.content.Context
import android.media.AudioManager
import android.util.Log
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.scene.ambience.R
import com.scene.ambience.data.model.EqSettings
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt
import java.util.Locale

private data class EqBand(val minHz: Int, val maxHz: Int)

private data class EqProbe(val bands: List<EqBand>, val minLevel: Int, val maxLevel: Int)

private fun loadEqProbe(context: Context): EqProbe? {
    // Session 0 ("global output mix") is not a portable way to probe effect capabilities —
    // several OEM audio stacks reject third-party AudioEffect creation on it. Band count,
    // level range and frequencies are static properties of the effect itself, so a throwaway
    // real session id works everywhere.
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
    "reduce_both" -> context.getString(R.string.eq_preset_reduce_both)
    else -> context.getString(R.string.eq_preset_custom)
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

// eq band levels are millibels; 100 mB = 1 dB, so 50 mB = 0.5 dB detents
private const val EQ_STEP_SIZE_MB = 50

// UI shows 10 log-spaced knobs regardless of the device band count; device bands are
// resampled from the 10-knob curve and vice versa (piecewise linear in log frequency).
private const val UI_BAND_COUNT = 10
private const val MIN_UI_FREQ_HZ = 20.0

private fun formatDb(value: Int): String {
    val db = value.toDouble() / 100.0
    return if (db == 0.0) "0" else String.format(Locale.US, "%+.1f", db)
}

private fun bandCenterHz(band: EqBand): Double =
    sqrt(band.minHz.coerceAtLeast(1).toDouble() * band.maxHz)

private fun logSpacedFreqs(minHz: Double, maxHz: Double, count: Int): List<Double> {
    val ratio = maxHz / minHz
    return List(count) { index -> minHz * ratio.pow(index.toDouble() / (count - 1)) }
}

private fun freqLabel(hz: Double): String {
    val k = hz / 1000.0
    return when {
        k < 1 -> hz.roundToInt().toString()
        k >= 10 -> "${k.roundToInt()}k"
        else -> String.format(Locale.US, "%.1fk", k)
    }
}

private fun sampleCurve(xs: List<Double>, ys: List<Int>, x: Double): Int {
    if (x <= xs.first()) return ys.first()
    if (x >= xs.last()) return ys.last()
    var i = 1
    while (x > xs[i]) i++
    val t = ((x - xs[i - 1]) / (xs[i] - xs[i - 1])).toFloat()
    return (ys[i - 1] + (ys[i] - ys[i - 1]) * t).roundToInt()
}

private val BAND_COLUMN_WIDTH = 30.dp
private val BAND_SLIDER_HEIGHT = 540.dp
private val BAND_SPACING = 4.dp
private val KNOB_INSET = 10.dp
private val VALUE_LABEL_HEIGHT = 18.dp
private val FREQ_LABEL_HEIGHT = 18.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EqScreen(
    initial: EqSettings,
    onApply: (EqSettings) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val probe = remember { loadEqProbe(context) }
    if (probe == null) {
        Column(
            modifier = modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(context.getString(R.string.settings_eq_unsupported))
        }
        return
    }

    val bandCount = probe.bands.size
    val deviceCenters = remember(probe) { probe.bands.map(::bandCenterHz) }
    val uiFreqs = remember(probe) {
        logSpacedFreqs(
            minHz = maxOf(MIN_UI_FREQ_HZ, probe.bands.first().minHz.toDouble()),
            maxHz = probe.bands.last().maxHz.toDouble(),
            count = UI_BAND_COUNT,
        )
    }

    var preset by remember(initial) {
        mutableStateOf(initial.presetName.takeIf { it in EQ_PRESET_KEYS } ?: "custom")
    }
    // UI truth: 10 independent knob levels. Dragging one knob moves only that knob;
    // the device bands are resampled from the whole knob curve for the engine.
    var knobLevels by remember {
        val device = resizeBands(initial.bands, bandCount)
        mutableStateOf(uiFreqs.map { freq -> sampleCurve(deviceCenters, device, freq) })
    }
    var presetExpanded by remember { mutableStateOf(false) }

    val deviceLevels = probe.bands.indices.map { j -> sampleCurve(uiFreqs, knobLevels, deviceCenters[j]) }

    fun push(newPreset: String, newKnobs: List<Int>) {
        preset = newPreset
        knobLevels = newKnobs
        val bands = probe.bands.indices.map { j -> sampleCurve(uiFreqs, newKnobs, deviceCenters[j]) }
        onApply(EqSettings(enabled = true, presetName = newPreset, bands = bands))
    }

    fun setKnob(index: Int, level: Int) {
        push("custom", knobLevels.mapIndexed { i, old -> if (i == index) level else old })
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                BandRack(
                    uiFreqs = uiFreqs,
                    knobLevels = knobLevels,
                    minLevel = probe.minLevel,
                    maxLevel = probe.maxLevel,
                    onSet = ::setKnob,
                )
                Text(
                    text = context.getString(R.string.eq_reset_hint),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            ExposedDropdownMenuBox(
                expanded = presetExpanded,
                onExpandedChange = { presetExpanded = it },
                modifier = Modifier.weight(1f),
            ) {
                OutlinedTextField(
                    value = presetLabel(context, preset),
                    onValueChange = {},
                    readOnly = true,
                    singleLine = true,
                    label = { Text(context.getString(R.string.eq_preset_section)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = presetExpanded) },
                    modifier = Modifier
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        .fillMaxWidth(),
                )
                ExposedDropdownMenu(
                    expanded = presetExpanded,
                    onDismissRequest = { presetExpanded = false },
                ) {
                    (EQ_PRESET_KEYS + "custom").forEach { key ->
                        DropdownMenuItem(
                            text = { Text(presetLabel(context, key)) },
                            onClick = {
                                presetExpanded = false
                                if (key != "custom") {
                                    val dev = presetLevels(probe, key)
                                    push(key, uiFreqs.map { f -> sampleCurve(deviceCenters, dev, f) })
                                }
                            },
                        )
                    }
                }
            }
            Spacer(Modifier.width(8.dp))
            IconButton(
                onClick = { push("flat", List(UI_BAND_COUNT) { 0 }) },
                modifier = Modifier.size(48.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.RestartAlt,
                    contentDescription = context.getString(R.string.eq_reset_all),
                    tint = MaterialTheme.colorScheme.primary,
                )
            }
        }

        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun BandRack(
    uiFreqs: List<Double>,
    knobLevels: List<Int>,
    minLevel: Int,
    maxLevel: Int,
    onSet: (index: Int, level: Int) -> Unit,
) {
    Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
        Box(Modifier.height(BAND_SLIDER_HEIGHT + VALUE_LABEL_HEIGHT + FREQ_LABEL_HEIGHT)) {
            val lineColor = MaterialTheme.colorScheme.primary
            val knobBorderColor = MaterialTheme.colorScheme.outlineVariant
            val knobFillColor = MaterialTheme.colorScheme.surfaceVariant
            Canvas(modifier = Modifier.matchParentSize()) {
                val pitch = (BAND_COLUMN_WIDTH + BAND_SPACING).toPx()
                val sliderTop = VALUE_LABEL_HEIGHT.toPx()
                val sliderH = BAND_SLIDER_HEIGHT.toPx()
                val inset = KNOB_INSET.toPx()
                fun knobY(value: Int): Float {
                    val frac = ((value - minLevel).toFloat() / (maxLevel - minLevel)).coerceIn(0f, 1f)
                    return sliderTop + inset + (1f - frac) * (sliderH - 2f * inset)
                }
                val flatY = knobY(0)
                drawLine(
                    color = lineColor.copy(alpha = 0.35f),
                    start = Offset(0f, flatY),
                    end = Offset(size.width, flatY),
                    strokeWidth = 1.dp.toPx(),
                )
                if (knobLevels.size > 1) {
                    val path = Path()
                    knobLevels.indices.forEach { index ->
                        val x = (BAND_COLUMN_WIDTH / 2).toPx() + index * pitch
                        if (index == 0) path.moveTo(x, knobY(knobLevels[index]))
                        else path.lineTo(x, knobY(knobLevels[index]))
                    }
                    drawPath(
                        path = path,
                        color = lineColor,
                        style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round),
                    )
                }
                knobLevels.forEachIndexed { index, value ->
                    val center = Offset(
                        (BAND_COLUMN_WIDTH / 2).toPx() + index * pitch,
                        knobY(value),
                    )
                    val active = value != 0
                    drawCircle(
                        color = if (active) lineColor else knobBorderColor,
                        radius = 7.dp.toPx(),
                        center = center,
                        style = Stroke(width = 2.dp.toPx()),
                    )
                    drawCircle(
                        color = if (active) lineColor.copy(alpha = 0.9f) else knobFillColor,
                        radius = 5.dp.toPx(),
                        center = center,
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(BAND_SPACING)) {
                knobLevels.forEachIndexed { index, value ->
                    BandKnob(
                        value = value,
                        label = freqLabel(uiFreqs[index]),
                        minLevel = minLevel,
                        maxLevel = maxLevel,
                        onValueChange = { onSet(index, it) },
                    )
                }
            }
        }
    }
}

@Composable
private fun BandKnob(
    value: Int,
    label: String,
    minLevel: Int,
    maxLevel: Int,
    onValueChange: (Int) -> Unit,
) {
    val currentValue by rememberUpdatedState(value)
    val travelDp = (BAND_SLIDER_HEIGHT - KNOB_INSET * 2f).value
    val mBPerDp = (maxLevel - minLevel).toFloat() / travelDp
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(BAND_COLUMN_WIDTH)
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = { if (currentValue != 0) onValueChange(0) })
            },
    ) {
        Text(
            text = formatDb(value),
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
            fontWeight = FontWeight.SemiBold,
            color = when {
                value > 0 -> MaterialTheme.colorScheme.primary
                value < 0 -> MaterialTheme.colorScheme.error
                else -> MaterialTheme.colorScheme.outline
            },
        )
        Box(
            modifier = Modifier
                .size(BAND_COLUMN_WIDTH, BAND_SLIDER_HEIGHT)
                .pointerInput(Unit) {
                    var startLevel = 0
                    var totalDp = 0f
                    detectVerticalDragGestures(
                        onDragStart = {
                            startLevel = currentValue
                            totalDp = 0f
                        },
                        onDragEnd = {},
                        onDragCancel = {},
                        onVerticalDrag = { change, dragAmount ->
                            change.consume()
                            totalDp += dragAmount.toDp().value
                            val level = (startLevel - (totalDp * mBPerDp).roundToInt())
                                .coerceIn(minLevel, maxLevel)
                            onValueChange(level / EQ_STEP_SIZE_MB * EQ_STEP_SIZE_MB)
                        },
                    )
                },
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
            color = MaterialTheme.colorScheme.outline,
        )
    }
}
