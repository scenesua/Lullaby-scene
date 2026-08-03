# Keep kotlinx.serialization metadata
-keepattributes *Annotation*, InnerClasses, EnclosingMethod, Signature
-keep,includedescriptorclasses class com.scene.ambience.**$$serializer { *; }
-keepclassmembers class com.scene.ambience.** {
    *** Companion;
}
-keepclasseswithmembers class com.scene.ambience.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Media3 ships its own consumer rules; keep default safety net
-keep class androidx.media3.** { *; }
-dontwarn org.checkerframework.**
-dontwarn com.google.errorprone.**
