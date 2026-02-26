#!/usr/bin/env node
/**
 * Generates PNG icon files required for the PWA / iOS Home Screen installation.
 * Run with: npm run generate-icons
 *
 * Produces:
 *   public/icons/icon-192.png       — manifest icon (192×192)
 *   public/icons/icon-512.png       — manifest icon (512×512)
 *   public/icons/apple-touch-icon.png — iOS Home Screen icon (180×180)
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

// Brand colours
const BG = { r: 30, g: 27, b: 75 };     // #1e1b4b  (deep indigo)
const FG = { r: 99, g: 102, b: 241 };   // #6366f1  (indigo-500)

/**
 * Draw a simple upward-trend sparkline on a solid background.
 * Pure PNG, no native bindings required — only pngjs.
 */
function createIcon(size, outPath) {
  const png = new PNG({ width: size, height: size, filterType: -1 });

  // Fill background
  for (let i = 0; i < size * size; i++) {
    const idx = i << 2;
    png.data[idx]     = BG.r;
    png.data[idx + 1] = BG.g;
    png.data[idx + 2] = BG.b;
    png.data[idx + 3] = 255;
  }

  // Draw a rounded-rect border in indigo
  const border = Math.round(size * 0.04);
  const radius = Math.round(size * 0.2);

  function setPixel(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) << 2;
    png.data[idx]     = c.r;
    png.data[idx + 1] = c.g;
    png.data[idx + 2] = c.b;
    png.data[idx + 3] = 255;
  }

  // Draw a sparkline (trend going up-right)
  const points = [
    [0.12, 0.72],
    [0.30, 0.58],
    [0.48, 0.40],
    [0.66, 0.32],
    [0.88, 0.20],
  ].map(([px, py]) => [Math.round(px * size), Math.round(py * size)]);

  const thickness = Math.max(2, Math.round(size * 0.05));

  for (let seg = 0; seg < points.length - 1; seg++) {
    const [x0, y0] = points[seg];
    const [x1, y1] = points[seg + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 4;
    for (let t = 0; t <= steps; t++) {
      const tx = Math.round(x0 + (x1 - x0) * (t / steps));
      const ty = Math.round(y0 + (y1 - y0) * (t / steps));
      for (let dy = -thickness; dy <= thickness; dy++) {
        for (let dx = -thickness; dx <= thickness; dx++) {
          if (dx * dx + dy * dy <= thickness * thickness) {
            setPixel(tx + dx, ty + dy, FG);
          }
        }
      }
    }
  }

  // Draw dots at each point
  const dotR = Math.max(3, Math.round(size * 0.055));
  for (const [px, py] of points) {
    for (let dy = -dotR; dy <= dotR; dy++) {
      for (let dx = -dotR; dx <= dotR; dx++) {
        if (dx * dx + dy * dy <= dotR * dotR) {
          setPixel(px + dx, py + dy, { r: 167, g: 139, b: 250 }); // violet-400
        }
      }
    }
  }

  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log(`  ✓ ${path.basename(outPath)}  (${size}×${size})`);
}

console.log('Generating icons…');
createIcon(192, path.join(ICONS_DIR, 'icon-192.png'));
createIcon(512, path.join(ICONS_DIR, 'icon-512.png'));
createIcon(180, path.join(ICONS_DIR, 'apple-touch-icon.png'));
console.log('Done.');
