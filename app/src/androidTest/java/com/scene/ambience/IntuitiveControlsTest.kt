package com.scene.ambience

import android.content.Context
import androidx.lifecycle.ViewModelProvider
import com.scene.ambience.presentation.AmbienceViewModel
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiScrollable
import androidx.test.uiautomator.UiSelector
import androidx.test.uiautomator.Until
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class IntuitiveControlsTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())

    private fun tab(labelId: Int): androidx.test.uiautomator.UiObject2 {
        val name = context.getString(labelId)
        val icons = device.findObjects(By.desc(name))
        val matches = if (icons.isNotEmpty()) icons else device.findObjects(By.text(name))
        return matches.maxByOrNull { it.visibleBounds.centerY() } ?: error("Missing navigation label $labelId")
    }

    private fun screenshot(name: String) {
        val folder = File(context.getExternalFilesDir(null), "ui-review").apply { mkdirs() }
        assertTrue(device.takeScreenshot(File(folder, "$name.png")))
        device.dumpWindowHierarchy(File(folder, "$name.xml"))
        // UTP uninstalls the test apps; copy evidence outside their data folders first.
        device.executeShellCommand("mkdir -p /sdcard/Download/lullaby-ui-review")
        device.executeShellCommand("cp ${folder.absolutePath}/$name.png /sdcard/Download/lullaby-ui-review/$name.png")
        device.executeShellCommand("cp ${folder.absolutePath}/$name.xml /sdcard/Download/lullaby-ui-review/$name.xml")
    }

    @Test
    fun navigationSwitchAndSliderWorkAtSmallSizes() {
        val originalFont = device.executeShellCommand("settings get system font_scale").trim()
        try {
            for (largeText in listOf(false, true)) {
                device.executeShellCommand("cmd uimode night ${if (largeText) "yes" else "no"}")
                device.executeShellCommand("settings put system font_scale ${if (largeText) 1.3 else 1.0}")
                device.executeShellCommand("wm density ${if (largeText) 540 else 480}")
                ActivityScenario.launch(MainActivity::class.java).use { scenario ->
                    lateinit var observedViewModel: AmbienceViewModel
                    scenario.onActivity { observedViewModel = ViewModelProvider(it)[AmbienceViewModel::class.java] }
                    assertTrue(device.wait(Until.hasObject(By.text(context.getString(R.string.scenes_question))), 20_000))
                    device.waitForIdle()
                    val labels = listOf(R.string.nav_scenes, R.string.nav_mixer, R.string.nav_presets_short, R.string.nav_fx, R.string.nav_settings)
                    val rectangles = labels.map { tab(it).visibleBounds }
                    rectangles.zipWithNext().forEach { (a, b) -> assertTrue("Navigation labels overlap", a.right < b.left) }
                    screenshot(if (largeText) "journey-320-large-text" else "journey-360")
                    tab(R.string.nav_mixer).click()
                    assertTrue("Mixer navigation completed", device.wait(Until.hasObject(By.text(context.getString(R.string.master_volume))), 10_000))
                    device.waitForIdle()
                    screenshot("mixer-before-scroll-${if (largeText) "large" else "normal"}")
                    val name = context.getString(R.string.source_rain)
                    // Bring the whole card into view, not just a switch clipped by the bottom bar.
                    UiScrollable(UiSelector().scrollable(true)).scrollIntoView(UiSelector().className("android.widget.SeekBar").childSelector(UiSelector().description(name)))
                    screenshot("mixer-before-switch-${if (largeText) "large" else "normal"}")
                    // Compose exposes the name as a child of the native control node.
                    val switchSelector = By.checkable(true).hasDescendant(By.desc(name))
                    assertNotNull(device.wait(Until.findObject(switchSelector), 10_000))
                    if (requireNotNull(device.findObject(switchSelector)).isChecked) requireNotNull(device.findObject(switchSelector)).click()
                    assertNotNull(device.wait(Until.findObject(switchSelector.checked(false)), 10_000))
                    requireNotNull(device.findObject(By.checkable(true).hasDescendant(By.desc(name)))).click()
                    val switchedOn = device.wait(Until.findObject(By.checkable(true).hasDescendant(By.desc(name)).checked(true)), 10_000)
                    screenshot("mixer-switched-on-${if (largeText) "large" else "normal"}")
                    assertNotNull("Switch on: connected=${observedViewModel.uiState.value.connected}, rain=${observedViewModel.uiState.value.snapshot?.sources?.get("rain")}", switchedOn)
                    requireNotNull(device.findObject(By.checkable(true).hasDescendant(By.desc(name)))).click()
                    assertNotNull(device.wait(Until.findObject(By.checkable(true).hasDescendant(By.desc(name)).checked(false)), 10_000))
                    UiScrollable(UiSelector().scrollable(true)).scrollIntoView(UiSelector().className("android.widget.SeekBar").childSelector(UiSelector().description(name)))
                    val slider = requireNotNull(device.findObject(By.clazz("android.widget.SeekBar").hasDescendant(By.desc(name)))) { "Native slider remains accessible" }
                    val bounds = slider.visibleBounds
                    device.swipe(bounds.left + bounds.width() / 4, bounds.centerY(), bounds.left + bounds.width() * 3 / 4, bounds.centerY(), 12)
                    assertNotNull(device.wait(Until.findObject(By.checkable(true).hasDescendant(By.desc(name)).checked(true)), 10_000))
                    screenshot(if (largeText) "mixer-320-large-text" else "mixer-360")
                    tab(R.string.nav_settings).click()
                    device.waitForIdle()
                    screenshot(if (largeText) "settings-320-large-text" else "settings-360")
                    if (!largeText) {
                        device.setOrientationLeft()
                        device.waitForIdle()
                        assertTrue(tab(R.string.nav_mixer).visibleBounds.width() > 0)
                        screenshot("landscape")
                        device.setOrientationNatural()
                    }
                }
            }
        } finally {
            device.setOrientationNatural()
            device.unfreezeRotation()
            device.executeShellCommand("settings put system font_scale $originalFont")
            device.executeShellCommand("wm density reset")
            device.executeShellCommand("cmd uimode night no")
        }
    }
}
