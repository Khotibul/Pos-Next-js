# Build Android APK (POS Pro)

Project ini memakai **Capacitor** sebagai wrapper Android untuk **hosted renderer** (website POS di Vercel).

Default URL renderer:
- `https://pos-next-js-kohl.vercel.app`

## Prasyarat
- Android Studio + Android SDK
- JDK 17/21 untuk Gradle/Android
- Windows: pastikan `JAVA_HOME` dan `ANDROID_HOME`/`ANDROID_SDK_ROOT` ter-set

Project menyediakan wrapper `scripts/run-android-gradle.cjs` agar Gradle otomatis memakai JDK kompatibel. Jika Java default mesin terlalu baru (misalnya Java 25), set:
- `ANDROID_JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`

## Konfigurasi URL (opsional)
Atur URL website yang akan dibuka oleh APK:
- `.env`: `CAPACITOR_SERVER_URL="https://domainmu.com"`

Config utama ada di `capacitor.config.ts`.

## Sync project Android
1. Install dependency:
   - `npm.cmd i`
2. Sync asset + config:
   - `npm.cmd run android:sync`

## Icon & splash (disarankan)
- Generate icon/splash:
  - `npm.cmd run android:assets`

## Buka di Android Studio
- `npm.cmd run android:open`

## Build APK Debug
- `npm.cmd run android:build:debug`

Output biasanya ada di:
- `android/app/build/outputs/apk/debug/app-debug.apk`

Opsional: copy ke website folder download:
- `npm.cmd run android:copy-apk:debug`
  - akan menyalin ke `public/downloads/pos-pro-debug.apk`

## Build APK Release (butuh keystore)
- `npm.cmd run android:build:release`

Catatan:
- Untuk release signing, konfigurasi `android/app/build.gradle` + keystore.
- Jangan commit file keystore (`*.jks`) ke repo.
