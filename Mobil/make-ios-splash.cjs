/**
 * Genera el Splash de iOS (2732x2732, fondo oscuro + logo centrado).
 * Uso: node make-ios-splash.cjs   (desde Mobil/)
 */
const fs = require('fs');
const path = require('path');
const { paint, downsample, SIZE } = require('../scripts/make-icon.cjs');

const S = 2732;
const bg = Buffer.alloc(S * S * 4);
for (let i = 0; i < S * S; i++) {
  bg[i * 4] = 0x07; bg[i * 4 + 1] = 0x0b; bg[i * 4 + 2] = 0x16; bg[i * 4 + 3] = 255;
}
const full = paint(SIZE);
const scaled = Math.round(S * 0.42);
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

// PNG vía zlib (reutiliza lógica mínima)
const zlib = require('zlib');
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(rgba, N) {
  const raw = Buffer.alloc(N * (N * 4 + 1));
  for (let y = 0; y < N; y++) {
    raw[y * (N * 4 + 1)] = 0;
    rgba.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = encodePng(bg, S);
const dir = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  fs.writeFileSync(path.join(dir, f), out);
  console.log(f, 'OK');
}
