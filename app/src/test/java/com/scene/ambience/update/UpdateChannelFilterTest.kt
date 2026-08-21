package com.scene.ambience.update

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdateChannelFilterTest {
    @Test
    fun normalStableAndAlphaTagsRemainEligible() {
        assertTrue(isInstallableUpdateTag("v1.0.3"))
        assertTrue(isInstallableUpdateTag("v1.1.0-alpha.4"))
    }

    @Test
    fun previewAndDebugTagsAreNotUpdateCandidates() {
        assertFalse(isInstallableUpdateTag("v1.1.0-alpha.3-space-preview.1"))
        assertFalse(isInstallableUpdateTag("v1.1.0-alpha.4-debug"))
    }

    @Test
    fun onlyInstallableReleaseApkNamesAreAccepted() {
        assertTrue(isInstallableUpdateApkName("Lullaby-Scene-v1.1.0-alpha.4.apk"))
        assertFalse(isInstallableUpdateApkName("Lullaby-Scene-v1.1.0-alpha.3-space-preview.1-debug.apk"))
        assertFalse(isInstallableUpdateApkName("Lullaby-Scene-v1.1.0-alpha.4-preview.apk"))
        assertFalse(isInstallableUpdateApkName("Lullaby-Scene-v1.1.0-alpha.4.apk.sha256"))
    }
}
