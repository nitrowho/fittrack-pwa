import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, '..', 'static');
const splashDir = path.join(staticDir, 'splash');
const iconPath = path.join(staticDir, 'icons', 'icon-512.png');

// Apple splash screen sizes: [width, height, pixelRatio]
const screens = [
  // iPhone SE, 8
  [750, 1334, 2],
  // iPhone 8 Plus
  [1242, 2208, 3],
  // iPhone X, XS, 11 Pro, 12 mini, 13 mini
  [1125, 2436, 3],
  // iPhone XR, 11
  [828, 1792, 2],
  // iPhone XS Max, 11 Pro Max
  [1242, 2688, 3],
  // iPhone 12, 12 Pro, 13, 13 Pro, 14
  [1170, 2532, 3],
  // iPhone 12 Pro Max, 13 Pro Max
  [1284, 2778, 3],
  // iPhone 14 Pro
  [1179, 2556, 3],
  // iPhone 14 Pro Max, 15 Plus, 16 Plus
  [1290, 2796, 3],
  // iPhone 14 Plus
  [1284, 2778, 3],
  // iPhone 15 Pro, 16
  [1179, 2556, 3],
  // iPhone 15 Pro Max, 16 Pro Max
  [1320, 2868, 3],
  // iPhone 16 Pro
  [1206, 2622, 3],
  // iPad mini
  [1536, 2048, 2],
  // iPad Air, iPad 10th gen
  [1640, 2360, 2],
  // iPad Pro 11"
  [1668, 2388, 2],
  // iPad Pro 12.9"
  [2048, 2732, 2],
];

// Deduplicate by dimensions
const unique = [...new Map(screens.map(s => [`${s[0]}x${s[1]}`, s])).values()];

async function generate() {
  const iconSize = 200;
  const icon = await sharp(iconPath)
    .resize(iconSize, iconSize)
    .toBuffer();

  for (const [width, height] of unique) {
    const filename = `splash-${width}x${height}.png`;
    const left = Math.round((width - iconSize) / 2);
    const top = Math.round((height - iconSize) / 2);

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([{ input: icon, left, top }])
      .png()
      .toFile(path.join(splashDir, filename));

    console.log(`Generated ${filename}`);
  }
}

generate().catch(console.error);
