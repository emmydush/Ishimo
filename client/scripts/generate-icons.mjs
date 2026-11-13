// Generates the square PWA / touch icons from the original stamp artwork.
// Run with:  npm i -D sharp && node scripts/generate-icons.mjs && npm uninstall sharp
//
// The source logo is a black stamp on a white background. White pixels are
// turned transparent (by luminance) and the artwork is centred on a gold
// square, which is what Android adaptive icons and iOS touch icons expect.
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC = path.resolve('public');
const SRC = path.join(PUBLIC, 'ishimo-logo.png');
const GOLD = { r: 212, g: 175, b: 55, alpha: 1 };

async function stamp() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i + 3] = Math.round(255 * (1 - luminance / 255));
  }
  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

async function makeIcon(size, fill, file, { flatten = false } = {}) {
  const inner = Math.round(size * fill);
  const artwork = await (await stamp())
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let image = sharp({
    create: { width: size, height: size, channels: 4, background: GOLD },
  }).composite([{ input: artwork, gravity: 'centre' }]);

  if (flatten) image = image.flatten({ background: GOLD });
  await image.png().toFile(path.join(PUBLIC, file));
  console.log(`  ${file}  ${size}x${size}`);
}

console.log('Generating icons from', SRC);
// Chrome install criteria: a real 192x192 and 512x512 PNG, plus maskable variants.
await makeIcon(192, 0.86, 'pwa-192.png');
await makeIcon(512, 0.86, 'pwa-512.png');
// Maskable: artwork stays inside the central 80% safe zone.
await makeIcon(192, 0.64, 'pwa-maskable-192.png');
await makeIcon(512, 0.64, 'pwa-maskable-512.png');
// iOS ignores alpha, so bake the background in.
await makeIcon(180, 0.8, 'apple-touch-icon.png', { flatten: true });
await makeIcon(32, 0.92, 'favicon-32.png', { flatten: true });
console.log('Done.');
