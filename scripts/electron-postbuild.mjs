import fs from "node:fs";
import path from "node:path";

const distRoot = path.join(process.cwd(), "dist-electron");
const electronOutDir = path.join(distRoot, "electron");
fs.mkdirSync(electronOutDir, { recursive: true });

// Ensure Electron runtime treats compiled output as CommonJS even when repo root is "type":"module".
// We write package.json at dist-electron root so any required files under dist-electron/** are CJS.
fs.writeFileSync(path.join(distRoot, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2), "utf8");
fs.writeFileSync(path.join(electronOutDir, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2), "utf8");

// eslint-disable-next-line no-console
console.log("[electron] wrote dist-electron/package.json + dist-electron/electron/package.json (type=commonjs)");
