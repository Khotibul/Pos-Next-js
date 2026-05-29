/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {
    // ignore
  }
}

function main() {
  const projectRoot = process.cwd();
  const cacheRoot = path.join(os.tmpdir(), "pos-desktop-electron-gyp");
  ensureDir(cacheRoot);

  // node-gyp (used by electron-rebuild) writes into the user's home directory.
  // On some environments (CI/sandbox), writing to the real home may be blocked.
  // Override HOME/USERPROFILE to a safe writable temp directory.
  const env = { ...process.env };
  env.HOME = cacheRoot;
  env.USERPROFILE = cacheRoot;

  const cliJs = path.join(projectRoot, "node_modules", "electron-rebuild", "lib", "src", "cli.js");
  const args = [cliJs, "-f", "-w", "better-sqlite3"];
  const r = spawnSync(process.execPath, args, { stdio: "inherit", env, windowsHide: true });
  if (r.error) {
    console.error("[rebuild-native] spawn failed:", r.error.message || r.error);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
}

main();
