package com.scene.ambience.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmarks
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.scene.ambience.R
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.presentation.AmbienceUiEvent
import com.scene.ambience.presentation.AmbienceViewModel
import com.scene.ambience.ui.screens.EqScreen
import com.scene.ambience.ui.screens.LicensesScreen
import com.scene.ambience.ui.screens.MixerScreen
import com.scene.ambience.ui.screens.PresetsScreen
import com.scene.ambience.ui.screens.ScenesScreen
import com.scene.ambience.ui.screens.SettingsScreen
import com.scene.ambience.ui.screens.TimerScreen
import kotlinx.coroutines.delay

const val ROUTE_SCENES = "scenes"
const val ROUTE_MIXER = "mixer"
const val ROUTE_PRESETS = "presets"
const val ROUTE_TIMER = "timer"
const val ROUTE_SETTINGS = "settings"
const val ROUTE_EQ = "eq"
const val ROUTE_LICENSES = "licenses"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AmbienceApp(viewModel: AmbienceViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val navController = rememberNavController()

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is AmbienceUiEvent.ShowMessage -> {
                    snackbarHostState.showSnackbar(
                        AmbienceStrings.messageText(context, event.message) ?: event.message
                    )
                }
                AmbienceUiEvent.RequestNotificationPermission -> {
                    if (Build.VERSION.SDK_INT >= 33) {
                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
            }
        }
    }

    // Cold-launch update check happens after the normal UI has rendered.
    LaunchedEffect(Unit) {
        delay(450L)
        viewModel.checkForUpdates(manual = false)
    }

    LaunchedEffect(state.snapshot?.message) {
        val message = state.snapshot?.message
        if (message != null) {
            snackbarHostState.showSnackbar(AmbienceStrings.messageText(context, message) ?: message)
            viewModel.clearMessage()
        }
    }

    LaunchedEffect(state.update.messageKey) {
        val key = state.update.messageKey ?: return@LaunchedEffect
        val text = when (key) {
            "update_up_to_date" -> context.getString(R.string.update_up_to_date)
            "update_check_failed" -> context.getString(R.string.update_check_failed)
            "update_download_failed" -> context.getString(R.string.update_download_failed)
            else -> key
        }
        snackbarHostState.showSnackbar(text)
        viewModel.clearUpdateMessage()
    }

    LaunchedEffect(state.update.installUri) {
        val raw = state.update.installUri ?: return@LaunchedEffect
        if (Build.VERSION.SDK_INT >= 26 && !context.packageManager.canRequestPackageInstalls()) {
            context.startActivity(
                Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${context.packageName}"),
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            snackbarHostState.showSnackbar(context.getString(R.string.update_allow_install_permission))
            viewModel.consumeInstallUri()
            return@LaunchedEffect
        }
        runCatching {
            context.startActivity(
                Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(raw), "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
        }.onFailure {
            snackbarHostState.showSnackbar(context.getString(R.string.update_install_failed))
        }
        viewModel.consumeInstallUri()
    }

    state.update.available?.takeIf { state.update.showPrompt }?.let { update ->
        AlertDialog(
            onDismissRequest = viewModel::dismissUpdatePrompt,
            title = { Text(context.getString(R.string.update_available_title)) },
            text = {
                Column {
                    Text(context.getString(R.string.update_version_change, com.scene.ambience.BuildConfig.VERSION_NAME, update.version))
                    if (update.notes.isNotBlank()) {
                        Text(
                            text = update.notes.take(800),
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 10.dp),
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.dismissUpdatePrompt()
                    viewModel.downloadUpdate()
                }) { Text(context.getString(R.string.update_now)) }
            },
            dismissButton = {
                Row {
                    TextButton(onClick = viewModel::suppressUpdateFor24Hours) {
                        Text(context.getString(R.string.update_hide_24h))
                    }
                    TextButton(onClick = viewModel::dismissUpdatePrompt) {
                        Text(context.getString(R.string.update_later))
                    }
                }
            },
        )
    }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: ROUTE_SCENES

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(titleForRoute(context, currentRoute), style = MaterialTheme.typography.titleLarge)
                        if (currentRoute in setOf(ROUTE_SCENES, ROUTE_MIXER, ROUTE_PRESETS, ROUTE_SETTINGS)) {
                            Text(
                                text = context.getString(R.string.app_name),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                },
                navigationIcon = {
                    if (currentRoute in setOf(ROUTE_TIMER, ROUTE_EQ, ROUTE_LICENSES)) {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = context.getString(R.string.action_back))
                        }
                    }
                },
                actions = {
                    FilledIconButton(onClick = viewModel::togglePlayPause) {
                        val playing = state.snapshot?.playbackState == PlaybackState.PLAYING
                        Icon(
                            imageVector = if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = context.getString(if (playing) R.string.action_pause else R.string.action_play),
                        )
                    }
                    if (currentRoute != ROUTE_TIMER) {
                        IconButton(onClick = { navController.navigate(ROUTE_TIMER) }) {
                            Icon(Icons.Filled.NightsStay, contentDescription = context.getString(R.string.timer_title))
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        bottomBar = {
            val navigationColors = NavigationBarItemDefaults.colors(
                selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                selectedTextColor = MaterialTheme.colorScheme.onSurface,
                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
                NavigationBarItem(
                    selected = currentRoute == ROUTE_SCENES,
                    onClick = { navController.navigateTo(ROUTE_SCENES) },
                    icon = { Icon(Icons.Filled.AutoAwesome, contentDescription = null) },
                    label = { Text(context.getString(R.string.nav_scenes)) },
                    colors = navigationColors,
                )
                NavigationBarItem(
                    selected = currentRoute == ROUTE_MIXER,
                    onClick = { navController.navigateTo(ROUTE_MIXER) },
                    icon = { Icon(Icons.Filled.GraphicEq, contentDescription = null) },
                    label = { Text(context.getString(R.string.nav_mixer)) },
                    colors = navigationColors,
                )
                NavigationBarItem(
                    selected = currentRoute == ROUTE_PRESETS,
                    onClick = { navController.navigateTo(ROUTE_PRESETS) },
                    icon = { Icon(Icons.Filled.Bookmarks, contentDescription = null) },
                    label = { Text(context.getString(R.string.nav_presets)) },
                    colors = navigationColors,
                )
                NavigationBarItem(
                    selected = currentRoute == ROUTE_SETTINGS,
                    onClick = { navController.navigateTo(ROUTE_SETTINGS) },
                    icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                    label = { Text(context.getString(R.string.nav_settings)) },
                    colors = navigationColors,
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = ROUTE_SCENES,
            modifier = Modifier.padding(padding),
        ) {
            composable(ROUTE_SCENES) { ScenesScreen(state, viewModel) }
            composable(ROUTE_MIXER) { MixerScreen(state, viewModel) }
            composable(ROUTE_PRESETS) { PresetsScreen(state, viewModel) }
            composable(ROUTE_TIMER) { TimerScreen(state, viewModel) }
            composable(ROUTE_SETTINGS) {
                SettingsScreen(
                    state = state,
                    viewModel = viewModel,
                    onOpenEq = { navController.navigate(ROUTE_EQ) },
                    onOpenLicenses = { navController.navigate(ROUTE_LICENSES) },
                )
            }
            composable(ROUTE_EQ) {
                EqScreen(
                    initial = state.eqSettings,
                    onApply = { eq -> viewModel.setEqualizer(eq.enabled, eq.presetName, eq.bands) },
                )
            }
            composable(ROUTE_LICENSES) { LicensesScreen(state) }
        }
    }
}

private fun androidx.navigation.NavHostController.navigateTo(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

private fun titleForRoute(context: android.content.Context, route: String): String = when (route) {
    ROUTE_SCENES -> context.getString(R.string.nav_scenes)
    ROUTE_MIXER -> context.getString(R.string.nav_mixer)
    ROUTE_PRESETS -> context.getString(R.string.nav_presets)
    ROUTE_TIMER -> context.getString(R.string.timer_title)
    ROUTE_SETTINGS -> context.getString(R.string.nav_settings)
    ROUTE_EQ -> context.getString(R.string.settings_eq)
    ROUTE_LICENSES -> context.getString(R.string.licenses)
    else -> context.getString(R.string.app_name)
}
