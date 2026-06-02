# Tutorial POS Desktop Electron + SQLite

Panduan ini dipakai untuk menjalankan aplikasi POS Desktop dengan database lokal SQLite (`better-sqlite3`). Database akan dibuat otomatis saat aplikasi Electron dibuka.

## 1. Prasyarat

- Node.js LTS 22.x atau versi yang kompatibel dengan project.
- Windows 10/11 64-bit.
- Jalankan terminal dari root project:

```powershell
cd "F:\Website Js\Pos-Next-js"
```

Install dependency:

```powershell
npm install
```

Generate Prisma web:

```powershell
npm run prisma:generate
```

## 2. Jalankan Desktop Mode Development

Gunakan script ini:

```powershell
npm run dev:desktop
```

Alurnya:

1. Next.js jalan di `http://localhost:3000`.
2. Electron dibuka dan memakai `ELECTRON_RENDERER_URL=http://localhost:3000`.
3. SQLite lokal dibuat otomatis.
4. Menu lisensi bisa dibuka di `Pengaturan > License (Desktop)`.

Jangan jalankan `npm run desktop:run` sendirian kalau Next dev belum berjalan, karena Electron akan gagal load `localhost:3000`.

## 2A. Mode Install / Production Tanpa `npm run dev:desktop`

Kalau aplikasi sudah dibuild menjadi EXE dan di-install di Windows, user tidak perlu menjalankan npm sama sekali.

Arsitektur production yang dipakai:

```text
POS Desktop EXE
  ↓ membuka renderer online
https://pos-next-js-kohl.vercel.app
  ↓ login online via Auth.js / database web
PostgreSQL / Neon
  ↓ data lokal desktop
SQLite di AppData
```

Jadi:

- Login tetap online memakai website/server SaaS.
- Database utama akun/tenant tetap PostgreSQL/Neon.
- Database desktop lokal tetap SQLite untuk lisensi, cache offline, queue sync, dan data lokal.
- EXE tidak menjalankan Next server lokal.
- EXE tidak butuh `npm run dev:desktop`.

Pastikan `package.json` memiliki metadata production:

```json
"extraMetadata": {
  "desktopRendererUrl": "https://pos-next-js-kohl.vercel.app",
  "desktopLicenseEndpoint": "https://pos-next-js-kohl.vercel.app/api/desktop/license/activate"
}
```

Script build production:

```powershell
npm run desktop:build
```

Setelah build:

1. Install `POS Desktop Enterprise Setup 0.1.0.exe`.
2. Buka aplikasi dari Start Menu/Desktop.
3. App otomatis membuka URL web production.
4. Login online seperti website.
5. Buka `Pengaturan > License (Desktop)`.
6. SQLite otomatis dibuat di AppData.
7. Klik `Refresh`.
8. Aktifkan trial atau masukkan serial lisensi.

Jika domain production berubah, ubah URL di:

- `package.json` → `build.extraMetadata.desktopRendererUrl`
- `package.json` → `build.extraMetadata.desktopLicenseEndpoint`
- script `desktop:build`

Lalu build ulang EXE.

## 3. Lokasi Database SQLite

### Development

Default:

```text
%TEMP%\pos-desktop-dev\data\pos_desktop.sqlite3
```

Jika ingin lokasi khusus:

```powershell
$env:DESKTOP_USERDATA_DIR="F:\Website Js\Pos-Next-js\.desktop-userdata"
npm run dev:desktop
```

Database:

```text
F:\Website Js\Pos-Next-js\.desktop-userdata\data\pos_desktop.sqlite3
```

### Production EXE

Default Electron:

```text
C:\Users\<USER>\AppData\Roaming\pos-saas-management-system\data\pos_desktop.sqlite3
```

Folder ini dibuat otomatis saat aplikasi dibuka.

Nama folder mengikuti `name` package Electron. Pada project ini biasanya:

```text
C:\Users\<USER>\AppData\Roaming\pos-saas-management-system
```

File SQLite:

```text
C:\Users\<USER>\AppData\Roaming\pos-saas-management-system\data\pos_desktop.sqlite3
```

## 4. Aktivasi Trial / Lisensi

1. Buka aplikasi desktop.
2. Login.
3. Masuk ke `Pengaturan > License (Desktop)`.
4. Klik `Refresh`.
5. Jika database siap, informasi device dan database akan tampil.
6. Jika masih belum siap, klik `Siapkan Database`.
7. Klik `Aktifkan Trial` untuk membuat lisensi lokal.
8. Atau masukkan `Serial License Key` dari web Super Admin.

Lisensi tersimpan di SQLite dan terikat device.

## 5. Jika Muncul “Database desktop belum siap”

Ikuti urutan ini.

### A. Pastikan Dibuka dari Electron, Bukan Browser

Fitur SQLite hanya tersedia jika aplikasi dibuka dari Electron. Jika membuka `http://localhost:3000` di Chrome biasa, database lokal tidak aktif.

Yang benar:

```powershell
npm run dev:desktop
```

### B. Restart Electron dan Klik Refresh

Tutup jendela Electron, lalu jalankan ulang:

```powershell
npm run dev:desktop
```

Masuk lagi ke:

```text
Pengaturan > License (Desktop) > Refresh
```

Jika tombol `Refresh` masih menampilkan error, klik:

```text
Siapkan Database
```

Tombol ini akan membuka ulang SQLite, membuat folder/tabel yang hilang, dan otomatis repair jika file database lokal rusak.

### C. Bersihkan Database Development yang Rusak

Jika pernah ada error saat init database, hapus folder dev user data:

```powershell
Remove-Item -LiteralPath "$env:TEMP\pos-desktop-dev" -Recurse -Force
npm run dev:desktop
```

Jika memakai `.desktop-userdata`:

```powershell
Remove-Item -LiteralPath ".\.desktop-userdata" -Recurse -Force
npm run dev:desktop
```

### D. Rebuild Native Module `better-sqlite3`

Jika error mengarah ke native binding, rebuild module untuk Electron:

```powershell
npm run desktop:rebuild-native
npm run electron:build
npm run dev:desktop
```

Untuk build installer, bisa pakai:

```powershell
$env:DESKTOP_REBUILD_NATIVE="1"
npm run desktop:build
```

### E. Pastikan AppData Bisa Ditulis

Untuk EXE production, pastikan Windows tidak memblokir folder:

```text
C:\Users\<USER>\AppData\Roaming\pos-saas-management-system
```

Jika perlu, hapus folder lama agar aplikasi membuat ulang database:

```powershell
Remove-Item -LiteralPath "$env:APPDATA\pos-saas-management-system" -Recurse -Force
```

Lalu buka ulang aplikasi.

## 6. Build EXE Desktop

Build installer:

```powershell
npm run desktop:build
```

Output akan masuk ke:

```text
dist-desktop-build\build-YYYYMMDD-HHMMSS\
```

Biasanya file yang dibuat:

- `POS Desktop Enterprise Setup 0.1.0.exe`
- `POS Desktop Enterprise 0.1.0.exe`

Untuk production normal, cukup bagikan file installer `.exe`. User tidak perlu source code, Node.js, atau npm.

## 7. Test EXE Setelah Build

1. Install `POS Desktop Enterprise Setup 0.1.0.exe`.
2. Buka aplikasi dari Start Menu/Desktop.
3. Login.
4. Masuk `Pengaturan > License (Desktop)`.
5. Klik `Refresh`.
6. Pastikan `Database Dir` mengarah ke AppData.
7. Klik `Aktifkan Trial`.

Jika masih muncul “Database desktop belum siap”, ulangi bagian troubleshooting nomor 5.

## 8. Catatan Penting

- SQLite desktop hanya berjalan di Electron main process.
- Client/browser tidak boleh import `better-sqlite3`.
- Renderer production memakai URL web dari `ELECTRON_RENDERER_URL`.
- Database lokal tidak sama dengan PostgreSQL/Neon web.
- Untuk development, jangan menjalankan beberapa Electron app sekaligus dengan userData yang sama.
