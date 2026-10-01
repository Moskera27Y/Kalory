/**
 * Genera el AppIcon de iOS desde el logo Kalory.
 * Uso: node make-ios-icons.cjs   (desde Mobil/)
 */
const fs = require('fs');
const path = require('path');
const { paint, downsample, encodePng, SIZE } = require('../scripts/make-icon.cjs');

const SET = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

const ICONS = [
  // [tamaño px, idiom, scale, size]
  [180, 'iphone', '3x', '60x60'],
  [120, 'iphone', '2x', '60x60'],
  [120, 'iphone', '3x', '40x40'],
  [80, 'iphone', '2x', '40x40'],
  [87, 'iphone', '3x', '29x29'],
  [58, 'iphone', '2x', '29x29'],
  [60, 'iphone', '3x', '20x20'],
  [40, 'iphone', '2x', '20x20'],
  [167, 'ipad', '2x', '83.5x83.5'],
  [152, 'ipad', '2x', '76x76'],
  [1024, 'ios-marketing', '1x', '1024x1024'],
];

const full = paint(SIZE);
fs.mkdirSync(SET, { recursive: true });
const images = [];
for (const [px, idiom, scale, size] of ICONS) {
  const name = `AppIcon-${px}.png`;
  fs.writeFileSync(path.join(SET, name), encodePng(downsample(full, SIZE, px), px));
  images.push({ size, idiom, filename: name, scale });
  console.log(name, 'OK');
}
fs.writeFileSync(
  path.join(SET, 'Contents.json'),
  JSON.stringify({ images, info: { version: 1, author: 'kalory' } }, null, 2),
);
console.log('Contents.json OK');
