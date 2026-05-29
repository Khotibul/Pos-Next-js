/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    ...opts,
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function buildStamp() {
  const d = new Date();
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-` +
    `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  const root = process.cwd();
  const outputDirRel = path.join("dist-desktop-build", `build-${buildStamp()}`);
  const outputDirAbs = path.join(root, outputDirRel);

  ensureDir(outputDirAbs);
  console.log(`[desktop-dist] Output: ${outputDirAbs}`);

  run("npm.cmd", ["run", "electron:build"]);
  run("npm.cmd", ["run", "desktop:rebuild-native"]);
  // Renderer is hosted (Vercel) for initial desktop production. We don't bundle local Next standalone.
  // Keep `build:desktop:renderer` script available for future offline/local renderer mode.

  // Build installer/portable into a unique output dir to avoid Windows file locks
  // on previous artifacts (Explorer preview/AV scanning).
  // IMPORTANT: pass relative path to avoid Windows CLI splitting on spaces in absolute path.
  run("electron-builder", [`--config.directories.output=${outputDirRel}`]);

  console.log(`[desktop-dist] Done. Artifacts in: ${outputDirAbs}`);
}

main();
