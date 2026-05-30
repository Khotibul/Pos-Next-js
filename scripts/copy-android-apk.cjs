/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

function main() {
  const root = process.cwd();
  const src = path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  const destDir = path.join(root, "public", "downloads");
  const dest = path.join(destDir, "pos-pro-debug.apk");

  if (!fs.existsSync(src)) {
    console.error("[copy-android-apk] File tidak ditemukan:", src);
    console.error("Jalankan dulu: npm run android:build:debug");
    process.exit(1);
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("[copy-android-apk] Copied:", src, "->", dest);
}

main();
