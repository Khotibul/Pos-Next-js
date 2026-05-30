# Android Release APK (Signed) — POS Pro

Tujuan: menghasilkan **APK release signed** agar instalasi lebih aman (mengurangi warning Play Protect saat sideload).

Catatan: Android masih bisa menampilkan peringatan saat install dari luar Play Store. Itu normal. Signed release + permission minimal akan mengurangi risiko diblokir.

## JDK yang kompatibel
Gunakan JDK 17/21 untuk Gradle/Android. Jika Java default mesin terlalu baru (misalnya Java 25 dan muncul `Unsupported class file major version 69`), pakai JBR Android Studio:
```bash
set ANDROID_JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

Script `npm.cmd run android:build:release` sudah memakai wrapper yang mencari JDK kompatibel otomatis.

## 1) Package name production
Sudah diset:
- `capacitor.config.ts`: `appId = com.pospro.mobile`
- `android/app/build.gradle`: `namespace` + `applicationId = com.pospro.mobile`

## 2) Icon & splash (disarankan)
Project ini sudah menambahkan `@capacitor/assets` dan file sumber:
- `assets/logo.svg`
- `assets/logo-dark.svg`

Generate assets Android:
- `npm.cmd run android:assets`

## 3) Generate keystore
Opsi manual:
```bash
keytool -genkeypair -v -keystore pos-pro-release.keystore -alias pospro -keyalg RSA -keysize 2048 -validity 10000
```

Simpan ke:
- `android/app/pos-pro-release.keystore`

Opsi script:
```bash
set ANDROID_KEYSTORE_PASSWORD=PasswordKuat123!
npm.cmd run android:keystore:generate
```

## 4) Buat file `keystore.properties`
Copy:
- `android/keystore.properties.example` → `android/keystore.properties`

Isi password sesuai keystore.

Penting:
- Jangan commit `android/keystore.properties` atau `.keystore` ke GitHub (sudah di `.gitignore`).

## 5) Sync Capacitor
- `npm.cmd run android:sync`

## 6) Build APK Release
- `npm.cmd run android:build:release`

Output:
- `android/app/build/outputs/apk/release/app-release.apk`

Rename untuk upload ke website:
- `pos-pro-v1.0.0.apk`

Opsional: copy ke website folder download (nama standar):
- `npm.cmd run android:copy-apk:release`
  - akan menyalin ke `public/downloads/pos-pro.apk`

## 7) Checksum SHA256
```bash
certutil -hashfile pos-pro-v1.0.0.apk SHA256
```

Tampilkan checksum di halaman `/download`.
