# Panduan Koneksi Printer Bluetooth

Panduan ini mencakup cara menghubungkan printer Bluetooth ke aplikasi POS, baik melalui **Aplikasi Android** maupun **Browser Web (Chrome/Edge)**.

---

## Daftar Isi

1. [Persyaratan](#1-persyaratan)
2. [Koneksi via Aplikasi Android](#2-koneksi-via-aplikasi-android)
3. [Koneksi via Browser Web (Desktop / Android)](#3-koneksi-via-browser-web)
4. [Cetak Struk Otomatis](#4-cetak-struk-otomatis)
5. [Memutuskan & Mengganti Printer](#5-memutuskan--mengganti-printer)
6. [Pemecahan Masalah](#6-pemecahan-masalah)

---

## 1. Persyaratan

### Android
- Perangkat Android versi 6.0 (API 23) atau lebih baru
- Bluetooth dan Lokasi harus **aktif**
- Izin lokasi diperlukan untuk menemukan perangkat Bluetooth
- Aplikasi POS versi terbaru sudah terinstal

### Browser Web (Desktop / Android)
- **Google Chrome** atau **Microsoft Edge** versi terbaru
- Web Bluetooth API didukung (tidak semua browser mendukung)
- Koneksi internet stabil
- Sistem operasi: Windows, macOS, Linux, ChromeOS, atau Android

### Printer
- Printer thermal Bluetooth (contoh: RPP02N, RPP03, 58mm Bluetooth printer)
- Printer dalam mode **pairing** (biasanya ditandai dengan LED biru/merah berkedip cepat)
- Baterai printer terisi cukup

---

## 2. Koneksi via Aplikasi Android

### 2.1. Buka Menu Pengaturan Printer

1. Buka aplikasi POS
2. Login ke akun Anda
3. Tap ikon **Profile / Settings** (pojok kanan atas)
4. Pilih menu **Pengaturan Printer**
5. Pada dropdown **Mode Koneksi**, pilih **"Bluetooth (Android Native)"**

### 2.2. Scan Perangkat Bluetooth

1. Tap tombol **Scan** — aplikasi akan mulai mencari perangkat Bluetooth di sekitar
2. Tunggu beberapa detik hingga daftar perangkat muncul
3. Pastikan printer Anda dalam mode **pairing** (LED berkedip cepat)
4. Perangkat yang ditemukan akan muncul dalam daftar

### 2.3. Hubungkan Printer

1. Dari daftar perangkat yang muncul, cari nama printer Anda (contoh: *RPP02N*, *58mm Printer*, dll.)
2. Tap tombol **Hubungkan** di samping nama printer
3. Tunggu proses koneksi selesai
4. Jika berhasil, akan muncul notifikasi **"Berhasil terhubung"** dan alamat MAC tersimpan otomatis
5. Indikator hijau **"Terhubung"** akan muncul di bawah kolom input

### 2.4. Simpan Pengaturan (Sekali Saja)

1. Setelah nama perangkat terisi otomatis, tap tombol **Simpan Pengaturan** di bagian bawah halaman
2. Pengaturan akan tersimpan — cetak berikutnya akan **otomatis terhubung** tanpa perlu pairing ulang

---

## 3. Koneksi via Browser Web

Cocok untuk pengguna yang menjalankan POS via browser di laptop/PC (Chrome/Edge).

### 3.1. Buka Pengaturan Printer

1. Buka aplikasi POS di browser (Chrome/Edge)
2. Login ke akun Anda
3. Klik ikon **Profile / Settings** (pojok kanan atas)
4. Pilih menu **Pengaturan Printer**
5. Pada dropdown **Mode Koneksi**, pilih **"Bluetooth (Web Bluetooth API)"**

### 3.2. Pairing Printer

1. Pada kolom **Nama Perangkat Bluetooth**, klik tombol **Pairing / Hubungkan**
2. Browser akan menampilkan dialog **"Request Bluetooth"** — ini adalah dialog resmi dari browser, bukan dari aplikasi

   **Penting:** Jika dialog tidak muncul, coba klik ulang tombol Pairing, atau pastikan browser dalam mode fokus (bukan background tab).

3. Dari dialog browser, pilih printer Bluetooth Anda dari daftar
4. Klik **Pair** / **Connect**
5. Jika diminta PIN/Password, coba:
   - `0000` (empat digit nol)
   - `1234`
   - Biarkan kosong (Enter)

### 3.3. Verifikasi Koneksi

- Setelah pairing berhasil, kolom **Nama Perangkat Bluetooth** akan terisi otomatis
- Indikator hijau **"Terhubung ke [nama printer]"** akan muncul
- Klik **Simpan Pengaturan** agar nama printer tersimpan untuk cetak berikutnya

> **Catatan:** Di Web, pairing hanya perlu dilakukan **sekali**. Pada cetak berikutnya, browser akan otomatis menyambung ulang ke printer yang sama.

---

## 4. Cetak Struk Otomatis

Setelah printer terhubung dan tersimpan di pengaturan:

1. Pastikan opsi **"Auto print setelah transaksi selesai"** diaktifkan di halaman pengaturan printer
2. Lakukan transaksi seperti biasa di halaman POS
3. Setelah pembayaran berhasil, printer akan mencetak struk secara otomatis

Jika auto-print mati, Anda bisa mencetak struk manual dari halaman riwayat transaksi.

---

## 5. Memutuskan & Mengganti Printer

### Android
- Di halaman pengaturan printer, tap tombol **Lupakan** (berwarna merah) untuk memutus koneksi
- Kosongkan kolom nama perangkat, lalu simpan pengaturan
- Hubungkan ke printer baru dengan mengikuti langkah [2. Koneksi via Aplikasi Android](#2-koneksi-via-aplikasi-android)

### Browser Web
- Klik tombol **Lupakan** di halaman pengaturan
- Browser akan memutus koneksi
- Untuk mengganti printer, lakukan pairing ulang dengan printer yang baru
- Simpan pengaturan setelah selesai

---

## 6. Pemecahan Masalah

| Masalah | Solusi |
|---|---|
| **Printer tidak muncul di daftar scan** | Pastikan printer dalam mode pairing (LED berkedip cepat). Di Android, pastikan Bluetooth dan Lokasi aktif. Coba scan ulang. |
| **Dialog Bluetooth browser tidak muncul** | Klik tombol Pairing sambil menahan tombol `Ctrl` (Windows) / `Cmd` (Mac). Pastikan browser mendukung Web Bluetooth (Chrome/Edge). |
| **Koneksi terputus setelah beberapa menit** | Beberapa printer thermal memiliki fitur auto-sleep. Coba cetak ulang — aplikasi akan otomatis menyambung ulang. |
| **Printer tidak mencetak** | Periksa:
  - Baterai printer terisi
  - Kertas terpasang dengan benar
  - Koneksi Bluetooth masih aktif (cek indikator hijau)
  - Nama perangkat di pengaturan sudah benar |
| **Teks struk berantakan / tidak rapi** | Di pengaturan printer, coba ganti **Ukuran Kertas** (58mm, 80mm) sesuai dengan printer yang digunakan. Untuk printer 48mm, pilih opsi 48mm. |
| **"Tidak ada perangkat Bluetooth ditemukan"** | Pada Android, pastikan izin **Lokasi** sudah diberikan ke aplikasi. Android memerlukan izin lokasi untuk scan Bluetooth. Pada Web, pastikan browser memiliki izin Bluetooth. |
| **Error: "Browser ini tidak mendukung Web Bluetooth API"** | Gunakan Chrome atau Edge versi terbaru. Web Bluetooth tidak didukung di Safari (iOS/Mac), Firefox, atau Internet Explorer. |
| **Struk tidak otomatis cetak** | Centang opsi **"Auto print setelah transaksi selesai"** di pengaturan printer dan simpan. |

---

## Catatan

- **Satu printer untuk satu perangkat**: Printer Bluetooth thermal umumnya hanya bisa terhubung ke satu perangkat dalam satu waktu.
- **Jarak maksimal**: Pastikan jarak antara perangkat dan printer tidak lebih dari 10 meter (tanpa halangan).
- **Printer tidak perlu dipairing ulang**: Setelah nama perangkat tersimpan, aplikasi akan otomatis menyambung setiap kali mencetak.
- **Web Bluetooth vs Android Native**: Mode Web Bluetooth membutuhkan browser Chrome/Edge dan menyediakan antarmuka pairing dialog browser. Mode Android Native menggunakan API sistem Android dan memberikan pengalaman yang lebih terintegrasi.
