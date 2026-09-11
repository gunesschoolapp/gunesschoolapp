# Add project specific ProGuard rules here.

# Preserve Capacitor core and plugins
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @com.getcapacitor.annotation.CapacitorPlugin public *;
    @android.webkit.JavascriptInterface public *;
}

# Preserve stack traces for Google Play crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Cordova compatibility
-keep class org.apache.cordova.** { *; }

