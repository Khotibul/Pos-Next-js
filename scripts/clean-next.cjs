/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

function rmSafe(p) {
  try {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  } catch (e) {
    console.warn("[clean-next] gagal hapus:", p, e && e.message ? e.message : e);
  }
}

function main() {
  const root = process.cwd();
  const distDir = process.env.DESKTOP_BUILD === "1" ? ".next-desktop" : ".next";
  rmSafe(path.join(root, distDir));
  console.log(`[clean-next] removed ${distDir}`);
}

main();
