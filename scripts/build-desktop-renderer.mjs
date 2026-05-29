import fs from "node:fs";
import path from "node:path";

function rmSafe(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Missing source dir: ${src}`);
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(from);
      fs.symlinkSync(link, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function main() {
  const root = process.cwd();
  const nextDir = path.join(root, ".next-desktop");
  const standaloneDir = path.join(nextDir, "standalone");
  const staticDir = path.join(nextDir, "static");
  const nextServerDir = path.join(nextDir, "server");
  const publicDir = path.join(root, "public");

  if (!fs.existsSync(standaloneDir)) {
    throw new Error("Next standalone output not found (.next-desktop/standalone). Run with DESKTOP_BUILD=1 next build first.");
  }

  const outRoot = path.join(root, "dist-desktop");
  const outRenderer = path.join(outRoot, "renderer");
  rmSafe(outRenderer);
  ensureDir(outRenderer);

  // Next standalone bundle contains server.js + minimal node_modules, usually under .next/standalone/.
  // Copy all contents into renderer root.
  copyDir(standaloneDir, outRenderer);

  // Copy static assets to renderer/.next/static
  const outNextStatic = path.join(outRenderer, ".next", "static");
  rmSafe(outNextStatic);
  ensureDir(path.dirname(outNextStatic));
  copyDir(staticDir, outNextStatic);

  // Safety net: some Windows setups (AV/locked cache) can cause incomplete standalone tracing.
  // Ensure critical server chunk directories exist by copying them from the full .next build.
  const outNextServer = path.join(outRenderer, ".next", "server");
  const outServerChunks = path.join(outNextServer, "chunks");
  const srcServerChunks = path.join(nextServerDir, "chunks");
  if (!fs.existsSync(outServerChunks) && fs.existsSync(srcServerChunks)) {
    copyDir(srcServerChunks, outServerChunks);
  }

  // Copy public assets (if any)
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, path.join(outRenderer, "public"));
  }

  // Convenience note
  // eslint-disable-next-line no-console
  console.log(`[desktop] Renderer prepared at: ${path.relative(root, outRenderer)}`);

  // Validate: renderer must contain server chunks referenced by runtime.
  // If missing, fail early before electron-builder packaging.
  const validateChunksDir = path.join(outRenderer, ".next", "server", "chunks");
  if (!fs.existsSync(validateChunksDir) || fs.readdirSync(validateChunksDir).length === 0) {
    throw new Error("Renderer chunks missing. Re-run desktop build after closing antivirus/Explorer locks.");
  }
}

try {
  main();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("[desktop] build renderer failed:", e instanceof Error ? e.message : e);
  process.exit(1);
}
