const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, 'Logo Baru Posqupro.png');
const PUBLIC = path.join(__dirname, 'public');
const BUILD = path.join(__dirname, 'build');
const ANDROID = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

async function generate() {
  const srcMeta = await sharp(SRC).metadata();
  console.log('Source:', srcMeta.width + 'x' + srcMeta.height);

  // Create square canvas with centered logo
  async function makeSquare(size, bgColor = { r: 255, g: 255, b: 255, alpha: 1 }) {
    const padding = Math.round(size * 0.1);
    const maxInner = size - padding * 2;
    const ratio = Math.min(maxInner / srcMeta.width, maxInner / srcMeta.height);
    const w = Math.round(srcMeta.width * ratio);
    const h = Math.round(srcMeta.height * ratio);
    const left = Math.round((size - w) / 2);
    const top = Math.round((size - h) / 2);

    const resized = await sharp(SRC)
      .resize(w, h, { fit: 'inside' })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bgColor
      }
    })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
  }

  // Create Android adaptive foreground (logo on transparent, with extra padding for safe zone)
  async function makeAndroidForeground(size) {
    const safeZone = 0.667; // adaptive icon safe zone is 66.7%
    const innerSize = Math.round(size * safeZone);
    const ratio = Math.min(innerSize / srcMeta.width, innerSize / srcMeta.height);
    const w = Math.round(srcMeta.width * ratio);
    const h = Math.round(srcMeta.height * ratio);
    const left = Math.round((size - w) / 2);
    const top = Math.round((size - h) / 2);

    const resized = await sharp(SRC)
      .resize(w, h, { fit: 'inside' })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
  }

  // Create solid color background
  async function makeSolidBg(size, r, g, b) {
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r, g, b, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
  }

  // 1. public/posqu-pro.png
  fs.copyFileSync(SRC, path.join(PUBLIC, 'posqu-pro.png'));
  console.log('✓ public/posqu-pro.png');

  // 2. public/icon-192.png
  fs.writeFileSync(path.join(PUBLIC, 'icon-192.png'), await makeSquare(192));
  console.log('✓ public/icon-192.png');

  // 3. public/icon-512.png
  fs.writeFileSync(path.join(PUBLIC, 'icon-512.png'), await makeSquare(512));
  console.log('✓ public/icon-512.png');

  // 4. public/apple-touch-icon.png
  fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), await makeSquare(180));
  console.log('✓ public/apple-touch-icon.png');

  // 5. public/favicon.ico
  try {
    const toIco = require('to-ico');
    const bufs = [];
    for (const s of [16, 32, 48]) {
      bufs.push(await makeSquare(s, { r: 0, g: 0, b: 0, alpha: 0 }));
    }
    fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), await toIco(bufs));
    console.log('✓ public/favicon.ico');
  } catch (e) {
    console.log('⚠ public/favicon.ico:', e.message);
  }

  // 6. build/icon.png (512x512)
  fs.writeFileSync(path.join(BUILD, 'icon.png'), await makeSquare(512));
  console.log('✓ build/icon.png');

  // 7. build/icon.ico
  try {
    const toIco = require('to-ico');
    const bufs = [];
    for (const s of [16, 32, 48, 64, 128, 256]) {
      bufs.push(await makeSquare(s, { r: 0, g: 0, b: 0, alpha: 0 }));
    }
    fs.writeFileSync(path.join(BUILD, 'icon.ico'), await toIco(bufs));
    console.log('✓ build/icon.ico');
  } catch (e) {
    console.log('⚠ build/icon.ico:', e.message);
  }

  // 8. Android mipmap icons
  const densities = {
    ldpi: 36,
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192
  };

  for (const [density, size] of Object.entries(densities)) {
    const dir = path.join(ANDROID, 'mipmap-' + density);
    if (!fs.existsSync(dir)) continue;

    // ic_launcher.png (square with white bg)
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), await makeSquare(size));
    // ic_launcher_round.png (same but will be masked by Android)
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), await makeSquare(size));
    // ic_launcher_foreground.png (transparent bg)
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), await makeAndroidForeground(size));
    // ic_launcher_background.png (solid white)
    fs.writeFileSync(path.join(dir, 'ic_launcher_background.png'), await makeSolidBg(size, 255, 255, 255));

    console.log('✓ mipmap-' + density + '/');
  }

  console.log('\nAll icons generated!');
}

generate().catch(e => { console.error(e); process.exit(1); });
