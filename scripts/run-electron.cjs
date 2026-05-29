/* eslint-disable no-console */
const { spawn } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

/**
 * IMPORTANT:
 * Some environments have `ELECTRON_RUN_AS_NODE=1` set globally.
 * If Electron is launched with that env var present, the Electron runtime APIs
 * (e.g. `require("electron").app`) will NOT be available and the app will crash.
 *
 * This runner ensures Electron is launched with the env var fully removed.
 */
function main() {
  const electronExe = require("electron"); // Returns the electron.exe path when required from Node.
  const appPath = path.resolve(process.cwd());

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  // Use a userData dir that works with Windows sandboxing and ACL.
  // Prefer LOCALAPPDATA. Fallback to TEMP.
  if (!env.DESKTOP_USERDATA_DIR) {
    const base =
      env.LOCALAPPDATA ||
      env.APPDATA ||
      (env.TEMP || env.TMP) ||
      os.tmpdir();
    env.DESKTOP_USERDATA_DIR = path.join(base, "pos-desktop-dev");
  }
  try {
    fs.mkdirSync(env.DESKTOP_USERDATA_DIR, { recursive: true });
  } catch {
    // ignore
  }

  const extraArgs = process.argv.slice(2);
  const child = spawn(electronExe, [appPath, ...extraArgs], {
    stdio: "inherit",
    env,
    windowsHide: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
}

main();
