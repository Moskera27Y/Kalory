/**
 * Logo transparente para el LaunchScreen de iOS.
 * Uso: node make-ios-launch.cjs   (desde Mobil/)
 */
const fs = require('fs');
const path = require('path');
const { paint, downsample, encodePng, SIZE } = require('../scripts/make-icon.cjs');

const SET = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'SplashLogo.imageset');
const full = paint(SIZE, false);
fs.mkdirSync(SET, { recursive: true });
const images = [];
for (const [px, scale] of [[340, '1x'], [680, '2x'], [1024, '3x']]) {
  const name = `SplashLogo-${px}.png`;
  fs.writeFileSync(path.join(SET, name), encodePng(downsample(full, SIZE, px), px));
  images.push({ idiom: 'universal', filename: name, scale });
  console.log(name, 'OK');
}
fs.writeFileSync(path.join(SET, 'Contents.json'), JSON.stringify({ images, info: { version: 1, author: 'kalory' } }, null, 2));
console.log('Contents.json OK');
