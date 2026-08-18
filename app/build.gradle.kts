import java.util.Base64
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

val generatedSceneAudioDir = layout.buildDirectory.dir("generated/sceneAudioAssets")
val decodeSceneAudio by tasks.registering {
    val sourceDir = file("src/main/sceneAudioBase64")
    inputs.dir(sourceDir)
    outputs.dir(generatedSceneAudioDir)
    doLast {
        val outDir = generatedSceneAudioDir.get().asFile
        outDir.deleteRecursively()
        outDir.mkdirs()
        val parts = listOf(
            "aircraft_cabin_cruise_001.part00",
            "aircraft_cabin_cruise_001.part01",
            "aircraft_cabin_cruise_001.part02",
            "aircraft_cabin_cruise_001.part03",
        )
        val encoded = parts.joinToString("") { sourceDir.resolve(it).readText().trim() }
        val decoded = Base64.getDecoder().decode(encoded)
        check(decoded.size == 16630) { "aircraft scene asset size mismatch: ${decoded.size}" }
        val output = outDir.resolve("ambience/aircraft_cabin/continuous/aircraft_cabin_cruise_001.ogg")
        output.parentFile.mkdirs()
        output.writeBytes(decoded)
    }
}

android {
    namespace = "com.scene.ambience"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.scene.ambience"
        minSdk = 26
        targetSdk = 36
        versionCode = 6
        versionName = "1.1.0-alpha.2"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    sourceSets {
        getByName("main").assets.srcDir(generatedSceneAudioDir)
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

tasks.named("preBuild").configure { dependsOn(decodeSceneAudio) }

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.service)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.session)
    implementation(libs.androidx.media3.common)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    debugImplementation(libs.androidx.compose.ui.tooling)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.kotlinx.serialization.json)
    testImplementation(libs.androidx.datastore.preferences)
    testImplementation(libs.androidx.test.core)

    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.core)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.uiautomator)
    androidTestImplementation(libs.kotlinx.coroutines.test)
}
