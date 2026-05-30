const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const targets = ["dist-desktop-build"];

for (const target of targets) {
  const abs = path.resolve(root, target);
  if (!abs.startsWith(root)) {
    throw new Error(`Refusing to remove outside workspace: ${abs}`);
  }

  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { recursive: true, force: true, maxRetries: 5, retryDelay: 1_000 });
  }
}
