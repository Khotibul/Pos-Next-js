export type AppPlatform = "ANDROID" | "WINDOWS";

export type AppRelease = {
  platform: AppPlatform;
  name: string;
  version: string;
  fileName: string;
  fileSize?: string;
  downloadUrl: string;
  sha256?: string;
  releaseDate: string; // ISO date string
  changelog: string[];
  requirements: string[];
  installGuide: string[];
};

function env(key: string) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

const ANDROID_URL = env("NEXT_PUBLIC_ANDROID_APK_URL") || "/downloads/pos-pro.apk";
const WINDOWS_URL = env("NEXT_PUBLIC_WINDOWS_EXE_URL") || "/downloads/pos-pro-setup.exe";

export const APP_RELEASES: AppRelease[] = [
  {
    platform: "ANDROID",
    name: "POS Pro Android",
    version: "v1.0.0",
    fileName: "pos-pro.apk",
    fileSize: undefined,
    downloadUrl: ANDROID_URL,
    sha256: undefined,
    releaseDate: "2026-05-30",
    changelog: [
      "Rilis awal aplikasi Android.",
      "Support login, sinkronisasi data, dan mode offline dasar.",
      "Scanner kamera untuk barcode/QR (bergantung permission).",
    ],
    requirements: ["Android 8+.", "Kamera untuk scan barcode/QR.", "Internet untuk sync (opsional).", "Mode offline tersedia."],
    installGuide: [
      "Klik Download APK.",
      "Jika muncul peringatan keamanan, pilih tetap install.",
      "Aktifkan “Install unknown apps” jika diminta.",
      "Buka aplikasi POS Pro.",
      "Login akun toko dan lakukan sinkronisasi awal.",
    ],
  },
  {
    platform: "WINDOWS",
    name: "POS Pro Desktop",
    version: "v1.0.0",
    fileName: "POS-Pro-Setup.exe",
    fileSize: undefined,
    downloadUrl: WINDOWS_URL,
    sha256: undefined,
    releaseDate: "2026-05-30",
    changelog: [
      "Rilis awal aplikasi Desktop Windows (Electron).",
      "Database lokal SQLite untuk offline-first.",
      "Fitur lisensi lokal + aktivasi serial key.",
    ],
    requirements: [
      "Windows 10/11 64-bit.",
      "RAM minimal 4GB.",
      "Storage minimal 500MB.",
      "Printer thermal opsional.",
      "Barcode scanner opsional.",
    ],
    installGuide: [
      "Klik Download EXE.",
      "Jalankan file installer.",
      "Jika Windows Defender muncul, pilih More Info → Run Anyway.",
      "Ikuti proses instalasi sampai selesai.",
      "Buka POS Pro Desktop.",
      "Aktivasi lisensi jika diminta, lalu login (atau gunakan mode offline jika tersedia).",
    ],
  },
];

export function getLatestRelease(platform: AppPlatform) {
  // Static config: first match acts as latest.
  return APP_RELEASES.find((r) => r.platform === platform) ?? null;
}

export function getAllReleasesByPlatform(platform: AppPlatform) {
  return APP_RELEASES.filter((r) => r.platform === platform);
}

