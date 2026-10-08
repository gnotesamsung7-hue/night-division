plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val buildNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "com.gnotesamsung7.nightdivision"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.gnotesamsung7.nightdivision"
        minSdk = 26
        targetSdk = 34
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
    }

    buildTypes {
        release { isMinifyEnabled = false }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    androidResources {
        noCompress += listOf("wasm", "task")
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.11.0")
}
