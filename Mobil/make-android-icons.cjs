/**
 * Genera iconos Android (mipmap por densidad) + splash desde el logo Kalory.
 * Uso: node make-android-icons.cjs   (desde Mobil/)
 */
const fs = require('fs');
const path = require('path');
const { paint, downsample, encodePng, SIZE } = require('../scripts/make-icon.cjs');

const RES = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const DENS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function solid(D, color) {
  const [r, g, b] = hex(color);
  const buf = Buffer.alloc(D * D * 4);
  for (let i = 0; i < D * D; i++) { buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255; }
  return buf;
}
/** Pega el logo centrado con margen (para que las máscaras adaptativas no lo recorten). */
function paddedFg(logoFull, D, scale = 0.62) {
  const out = Buffer.alloc(D * D * 4); // transparente
  const s = Math.round(D * scale);
  const small = downsample(logoFull, SIZE, s);
  const ox = Math.round((D - s) / 2), oy = Math.round((D - s) / 2);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const si = (y * s + x) * 4;
      const sa = small[si + 3] / 255;
      const di = ((oy + y) * D + (ox + x)) * 4;
      // over sobre transparente
      out[di] = Math.round(small[si] * sa + out[di] * (1 - sa));
      out[di + 1] = Math.round(small[si + 1] * sa + out[di + 1] * (1 - sa));
      out[di + 2] = Math.round(small[si + 2] * sa + out[di + 2] * (1 - sa));
      out[di + 3] = Math.round(sa * 255);
    }
  }
  return out;
}

const full = paint(SIZE);
for (const [dens, D] of Object.entries(DENS)) {
  const dir = path.join(RES, `mipmap-${dens}`);
  fs.mkdirSync(dir, { recursive: true });
  const legacy = downsample(full, SIZE, D);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), encodePng(legacy, D));
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), encodePng(legacy, D));
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), encodePng(paddedFg(full, D), D));
  fs.writeFileSync(path.join(dir, 'ic_launcher_background.png'), encodePng(solid(D, '#070B16'), D));
  console.log(`mipmap-${dens} OK`);
}

// Splash 1024: logo al 55% sobre fondo oscuro
const S = 1024;
const bg = solid(S, '#070B16');
const scaled = Math.round(S * 0.55);
const small = downsample(full, SIZE, scaled);
const ox = Math.round((S - scaled) / 2), oy = Math.round((S - scaled) / 2);
for (let y = 0; y < scaled; y++) {
  for (let x = 0; x < scaled; x++) {
    const si = (y * scaled + x) * 4;
    const sa = small[si + 3] / 255;
    if (sa === 0) continue;
    const di = ((oy + y) * S + (ox + x)) * 4;
    bg[di] = Math.round(small[si] * sa + bg[di] * (1 - sa));
    bg[di + 1] = Math.round(small[si + 1] * sa + bg[di + 1] * (1 - sa));
    bg[di + 2] = Math.round(small[si + 2] * sa + bg[di + 2] * (1 - sa));
  }
}
fs.writeFileSync(path.join(RES, 'drawable', 'splash.png'), encodePng(bg, S));
console.log('drawable/splash.png OK');
