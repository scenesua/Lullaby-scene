package com.scene.ambience.update

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import com.scene.ambience.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

@Serializable
private data class GithubRelease(
    @SerialName("tag_name") val tagName: String,
    val name: String? = null,
    val body: String? = null,
    val draft: Boolean = false,
    val prerelease: Boolean = false,
    @SerialName("published_at") val publishedAt: String? = null,
    val assets: List<GithubAsset> = emptyList(),
)

@Serializable
private data class GithubAsset(
    val name: String,
    @SerialName("browser_download_url") val browserDownloadUrl: String,
    val size: Long = 0L,
    @SerialName("content_type") val contentType: String = "",
    val digest: String? = null,
)

data class UpdateReleaseInfo(
    val version: String,
    val title: String,
    val notes: String,
    val publishedAt: String?,
    val apkName: String,
    val apkUrl: String,
    val apkSize: Long,
    val expectedSha256: String?,
    val checksumUrl: String?,
)

data class UpdateUiState(
    val checking: Boolean = false,
    val available: UpdateReleaseInfo? = null,
    val showPrompt: Boolean = false,
    val downloading: Boolean = false,
    val downloadProgress: Int? = null,
    val installUri: String? = null,
    val messageKey: String? = null,
)

/** GitHub-distribution updater. Stable-only by default; prereleases are opt-in. */
class UpdateCoordinator(context: Context) {
    private val appContext = context.applicationContext
    private val json = Json { ignoreUnknownKeys = true }
    private val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val _state = MutableStateFlow(UpdateUiState())
    val state: StateFlow<UpdateUiState> = _state.asStateFlow()

    suspend fun check(manual: Boolean, includePrereleases: Boolean) = withContext(Dispatchers.IO) {
        _state.value = _state.value.copy(checking = true, messageKey = null)
        try {
            val release = fetchLatestRelease(includePrereleases)
            val apk = release.assets.firstOrNull(::isAppApk)
            val remoteVersion = release.tagName.removePrefix("v")
            if (apk == null || compareVersions(BuildConfig.VERSION_NAME, remoteVersion) >= 0) {
                _state.value = UpdateUiState(
                    checking = false,
                    available = null,
                    showPrompt = false,
                    messageKey = if (manual) "update_up_to_date" else null,
                )
                return@withContext
            }

            val checksumAsset = release.assets.firstOrNull { it.name == apk.name + ".sha256" }
            val digest = apk.digest
                ?.takeIf { it.startsWith("sha256:", ignoreCase = true) }
                ?.substringAfter(':')
                ?.trim()
            val info = UpdateReleaseInfo(
                version = remoteVersion,
                title = release.name?.takeIf { it.isNotBlank() } ?: release.tagName,
                notes = release.body.orEmpty(),
                publishedAt = release.publishedAt,
                apkName = apk.name,
                apkUrl = apk.browserDownloadUrl,
                apkSize = apk.size,
                expectedSha256 = digest,
                checksumUrl = checksumAsset?.browserDownloadUrl,
            )
            val suppressed = !manual && isSuppressed(info.version)
            _state.value = UpdateUiState(
                checking = false,
                available = info,
                showPrompt = !suppressed,
                messageKey = null,
            )
        } catch (_: Exception) {
            _state.value = _state.value.copy(
                checking = false,
                showPrompt = false,
                messageKey = if (manual) "update_check_failed" else null,
            )
        }
    }

    fun dismissPrompt() {
        _state.value = _state.value.copy(showPrompt = false)
    }

    fun suppressFor24Hours() {
        val version = _state.value.available?.version ?: return
        prefs.edit()
            .putString(KEY_SUPPRESSED_VERSION, version)
            .putLong(KEY_SUPPRESS_UNTIL, System.currentTimeMillis() + SUPPRESS_MS)
            .apply()
        _state.value = _state.value.copy(showPrompt = false)
    }

    suspend fun downloadAvailable() = withContext(Dispatchers.IO) {
        val release = _state.value.available ?: return@withContext
        if (_state.value.downloading) return@withContext
        _state.value = _state.value.copy(downloading = true, downloadProgress = 0, messageKey = null)
        try {
            val updateDir = File(appContext.cacheDir, "updates").apply { mkdirs() }
            updateDir.listFiles()?.filter { it.name != release.apkName }?.forEach { it.delete() }
            val partial = File(updateDir, release.apkName + ".part")
            val target = File(updateDir, release.apkName)
            partial.delete()

            downloadToFile(release.apkUrl, partial, release.apkSize) { progress ->
                _state.value = _state.value.copy(downloadProgress = progress)
            }
            val expected = release.expectedSha256 ?: release.checksumUrl?.let { fetchChecksum(it) }
            if (expected != null && !sha256(partial).equals(expected, ignoreCase = true)) {
                partial.delete()
                throw IllegalStateException("digest mismatch")
            }
            if (target.exists()) target.delete()
            if (!partial.renameTo(target)) {
                partial.copyTo(target, overwrite = true)
                partial.delete()
            }
            val uri: Uri = FileProvider.getUriForFile(
                appContext,
                BuildConfig.APPLICATION_ID + ".fileprovider",
                target,
            )
            _state.value = _state.value.copy(
                downloading = false,
                downloadProgress = 100,
                installUri = uri.toString(),
            )
        } catch (_: Exception) {
            _state.value = _state.value.copy(
                downloading = false,
                downloadProgress = null,
                installUri = null,
                messageKey = "update_download_failed",
            )
        }
    }

    fun consumeInstallUri() {
        _state.value = _state.value.copy(installUri = null)
    }

    fun clearMessage() {
        _state.value = _state.value.copy(messageKey = null)
    }

    private fun isSuppressed(version: String): Boolean {
        val suppressedVersion = prefs.getString(KEY_SUPPRESSED_VERSION, null)
        val until = prefs.getLong(KEY_SUPPRESS_UNTIL, 0L)
        return suppressedVersion == version && System.currentTimeMillis() < until
    }

    private fun fetchLatestRelease(includePrereleases: Boolean): GithubRelease {
        if (!includePrereleases) return fetchLatestStable()

        val conn = open(LIST_RELEASES)
        return conn.useConnection { connection ->
            if (connection.responseCode !in 200..299) throw IllegalStateException("HTTP ${connection.responseCode}")
            val text = connection.inputStream.bufferedReader().use { it.readText() }
            val releases = json.decodeFromString<List<GithubRelease>>(text)
                .filterNot { it.draft }
                .filter { release -> release.assets.any(::isAppApk) }
            releases.maxWithOrNull { a, b -> compareVersions(a.tagName, b.tagName) }
                ?: throw IllegalStateException("no published release")
        }
    }

    private fun fetchLatestStable(): GithubRelease {
        val conn = open(GET_LATEST_RELEASE)
        return conn.useConnection { connection ->
            if (connection.responseCode !in 200..299) throw IllegalStateException("HTTP ${connection.responseCode}")
            val text = connection.inputStream.bufferedReader().use { it.readText() }
            val release = json.decodeFromString<GithubRelease>(text)
            if (release.draft || release.prerelease) throw IllegalStateException("not stable")
            release
        }
    }

    private fun isAppApk(asset: GithubAsset): Boolean =
        asset.name.startsWith("Lullaby-Scene-", ignoreCase = true) &&
            asset.name.endsWith(".apk", ignoreCase = true)

    private fun fetchChecksum(url: String): String? {
        val conn = open(url)
        return conn.useConnection { connection ->
            if (connection.responseCode !in 200..299) return@useConnection null
            connection.inputStream.bufferedReader().use { it.readText() }
                .trim()
                .split(Regex("\\s+"))
                .firstOrNull()
                ?.takeIf { it.matches(Regex("[0-9a-fA-F]{64}")) }
        }
    }

    private fun downloadToFile(url: String, output: File, expectedSize: Long, onProgress: (Int) -> Unit) {
        val conn = open(url)
        conn.useConnection { connection ->
            if (connection.responseCode !in 200..299) throw IllegalStateException("HTTP ${connection.responseCode}")
            val total = connection.contentLengthLong.takeIf { it > 0 } ?: expectedSize
            connection.inputStream.use { input ->
                output.outputStream().buffered().use { out ->
                    val buffer = ByteArray(64 * 1024)
                    var read: Int
                    var done = 0L
                    var last = -1
                    while (input.read(buffer).also { read = it } >= 0) {
                        if (read == 0) continue
                        out.write(buffer, 0, read)
                        done += read
                        if (total > 0) {
                            val progress = ((done * 100L) / total).toInt().coerceIn(0, 99)
                            if (progress != last) {
                                last = progress
                                onProgress(progress)
                            }
                        }
                    }
                }
            }
            if (expectedSize > 0L && output.length() != expectedSize) {
                throw IllegalStateException("size mismatch")
            }
        }
    }

    private fun open(url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8_000
            readTimeout = 30_000
            instanceFollowRedirects = true
            setRequestProperty("Accept", "application/vnd.github+json")
            setRequestProperty("User-Agent", "LullabyScene/${BuildConfig.VERSION_NAME}")
            setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
        }

    private inline fun <T> HttpURLConnection.useConnection(block: (HttpURLConnection) -> T): T =
        try { block(this) } finally { disconnect() }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(64 * 1024)
            var read: Int
            while (input.read(buffer).also { read = it } >= 0) {
                if (read > 0) digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    internal fun compareVersions(installed: String, remote: String): Int {
        val a = ParsedVersion.parse(installed)
        val b = ParsedVersion.parse(remote)
        for (i in 0..2) {
            val cmp = a.numbers[i].compareTo(b.numbers[i])
            if (cmp != 0) return cmp
        }
        if (a.preRelease == null && b.preRelease != null) return 1
        if (a.preRelease != null && b.preRelease == null) return -1
        return comparePreRelease(a.preRelease, b.preRelease)
    }

    private fun comparePreRelease(a: String?, b: String?): Int {
        if (a == null && b == null) return 0
        if (a == null) return 1
        if (b == null) return -1
        val left = a.split('.', '-')
        val right = b.split('.', '-')
        val size = maxOf(left.size, right.size)
        for (i in 0 until size) {
            val x = left.getOrNull(i) ?: return -1
            val y = right.getOrNull(i) ?: return 1
            val xn = x.toIntOrNull()
            val yn = y.toIntOrNull()
            val cmp = when {
                xn != null && yn != null -> xn.compareTo(yn)
                xn != null -> -1
                yn != null -> 1
                else -> x.compareTo(y, ignoreCase = true)
            }
            if (cmp != 0) return cmp
        }
        return 0
    }

    private data class ParsedVersion(val numbers: List<Int>, val preRelease: String?) {
        companion object {
            fun parse(raw: String): ParsedVersion {
                val cleaned = raw.trim().removePrefix("v")
                val core = cleaned.substringBefore('-').substringBefore('+')
                val nums = core.split('.').take(3).map { it.toIntOrNull() ?: 0 }.toMutableList()
                while (nums.size < 3) nums += 0
                val pre = cleaned.substringAfter('-', "").substringBefore('+').ifBlank { null }
                return ParsedVersion(nums, pre)
            }
        }
    }

    companion object {
        private const val GET_LATEST_RELEASE = "https://api.github.com/repos/scenesua/Lullaby-scene/releases/latest"
        private const val LIST_RELEASES = "https://api.github.com/repos/scenesua/Lullaby-scene/releases?per_page=30"
        private const val PREFS = "lullaby_updates"
        private const val KEY_SUPPRESSED_VERSION = "suppressed_version"
        private const val KEY_SUPPRESS_UNTIL = "suppress_until"
        private const val SUPPRESS_MS = 24L * 60L * 60L * 1000L
    }
}
