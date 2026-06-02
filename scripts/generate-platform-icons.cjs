/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = process.cwd();
const source = path.join(root, "public", "posqu-pro.png");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function pngBuffer(size, opts = {}) {
  const padding = opts.padding ?? Math.round(size * 0.12);
  const background = opts.background ?? { r: 0, g: 0, b: 0, alpha: 0 };
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([
      {
        input: await sharp(source)
          .resize(size - padding * 2, size - padding * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toBuffer();
}

function makeIcoEntry(buffer, size, offset) {
  const header = Buffer.alloc(16);
  header.writeUInt8(size >= 256 ? 0 : size, 0);
  header.writeUInt8(size >= 256 ? 0 : size, 1);
  header.writeUInt8(0, 2);
  header.writeUInt8(0, 3);
  header.writeUInt16LE(1, 4);
  header.writeUInt16LE(32, 6);
  header.writeUInt32LE(buffer.length, 8);
  header.writeUInt32LE(offset, 12);
  return header;
}

async function writeIco(filePath) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(sizes.map((size) => pngBuffer(size, { padding: Math.max(2, Math.round(size * 0.12)) })));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(buffers.length, 4);
  let offset = 6 + buffers.length * 16;
  const entries = buffers.map((buffer, index) => {
    const entry = makeIcoEntry(buffer, sizes[index], offset);
    offset += buffer.length;
    return entry;
  });
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, Buffer.concat([header, ...entries, ...buffers]));
}

async function writePng(filePath, size, opts) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, await pngBuffer(size, opts));
}

async function writeSolidPng(filePath, size, background) {
  ensureDir(path.dirname(filePath));
  const buffer = await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .png()
    .toBuffer();
  fs.writeFileSync(filePath, buffer);
}

async function main() {
  if (!fs.existsSync(source)) {
    throw new Error(`Source logo not found: ${source}`);
  }

  await writeIco(path.join(root, "public", "favicon.ico"));
  await writeIco(path.join(root, "build", "icon.ico"));

  await writePng(path.join(root, "public", "icon-192.png"), 192);
  await writePng(path.join(root, "public", "icon-512.png"), 512);
  await writePng(path.join(root, "public", "apple-touch-icon.png"), 180);
  await writePng(path.join(root, "build", "icon.png"), 512);

  const densities = [
    ["mipmap-mdpi", 48],
    ["mipmap-hdpi", 72],
    ["mipmap-xhdpi", 96],
    ["mipmap-xxhdpi", 144],
    ["mipmap-xxxhdpi", 192],
  ];
  for (const [folder, size] of densities) {
    const dir = path.join(root, "android", "app", "src", "main", "res", folder);
    await writePng(path.join(dir, "ic_launcher.png"), size, { padding: Math.round(size * 0.08) });
    await writePng(path.join(dir, "ic_launcher_round.png"), size, { padding: Math.round(size * 0.08) });
    await writePng(path.join(dir, "ic_launcher_foreground.png"), size, { padding: Math.round(size * 0.16) });
    await writeSolidPng(path.join(dir, "ic_launcher_background.png"), size, { r: 255, g: 255, b: 255, alpha: 1 });
  }

  const manifest = {
    name: "POSQU Pro",
    short_name: "POSQU Pro",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: "#0b57d0",
    background_color: "#ffffff",
    display: "standalone",
  };
  fs.writeFileSync(path.join(root, "public", "site.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("[icons] Generated web, Electron, and Android icons from public/posqu-pro.png");
}

main().catch((error) => {
  console.error("[icons] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
