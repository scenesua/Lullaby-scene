package com.scene.ambience.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.scene.ambience.R
import com.scene.ambience.data.model.LicenseEntry
import com.scene.ambience.presentation.AmbienceUiState
import com.scene.ambience.ui.AmbienceStrings

@Composable
fun LicensesScreen(
    state: AmbienceUiState,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val licenses = state.library.licenses
    val bySource = licenses.groupBy { it.sourceName ?: it.assetId }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (licenses.isEmpty()) {
            item {
                Text(
                    text = context.getString(R.string.licenses_empty),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
        }
        items(bySource.keys.toList(), key = { it }) { sourceKey ->
            val entries = bySource[sourceKey].orEmpty()
            LicenseCard(sourceKey, entries, context.getString(R.string.attribution_required))
        }
    }
}

@Composable
private fun LicenseCard(
    sourceKey: String,
    entries: List<LicenseEntry>,
    attributionLabel: String,
) {
    val context = LocalContext.current
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = sourceKey,
                style = MaterialTheme.typography.titleSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            entries.forEach { entry ->
                val line = buildString {
                    entry.creator?.let { append(it) }
                    entry.license?.let { if (isNotEmpty()) append(" · "); append(it) }
                    if (entry.licenseStatus == "verified") {
                        append(" · ").append(context.getString(R.string.license_verified))
                    }
                }
                if (line.isNotEmpty()) {
                    Text(
                        text = line,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                entry.sourcePage?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            if (entries.any { it.attributionRequired }) {
                Text(
                    text = attributionLabel,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}
