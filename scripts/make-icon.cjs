/**
 * Genera assets/icon.ico (multi-tamaño) pintando el logo Kalory píxel a píxel.
 * Sin dependencias: PNG codificado a mano (zlib) + contenedor ICO con PNG.
 * Uso: node scripts/make-icon.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets', 'icon.ico');
const SIZE = 256;

// ---------- utilidades ----------
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
// gradiente por paradas [[pos, color]]
function gradient(stops, t) {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t >= p0 && t <= p1) return mix(hex(c0), hex(c1), (t - p0) / (p1 - p0 || 1));
  }
  return hex(stops[stops.length - 1][1]);
}

const RING_STOPS = [[0, '#10B981'], [0.38, '#34D399'], [0.62, '#F59E0B'], [0.85, '#F97316'], [1, '#10B981']];
const FLAME_STOPS = [[0, '#10B981'], [0.45, '#4ADE80'], [0.68, '#FBBF24'], [0.86, '#F97316'], [1, '#EF4444']];

// ---------- pintado ----------
function paint(N) {
  const buf = Buffer.alloc(N * N * 4);
  const cx = N / 2, cy = N / 2;
  const R = N * 0.352, W = N * 0.098; // radio medio y grosor del anillo
  const RR = N * 0.227; // radio esquinas del fondo
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      // fondo: cuadrado redondeado con degradado vertical
      const qx = Math.max(Math.abs(x + 0.5 - cx) - (cx - RR), 0);
      const qy = Math.max(Math.abs(y + 0.5 - cy) - (cy - RR), 0);
      const qd = Math.hypot(qx, qy);
      const bgA = 1 - smoothstep(RR - N * 0.008, RR, qd);
      if (bgA > 0) {
        const t = y / N;
        const top = hex('#16213B'), bot = hex('#0A0F1E');
        [r, g, b] = mix(top, bot, t);
        a = bgA;
      }
      const px = x + 0.5, py = y + 0.5;
      // anillo
      const dist = Math.hypot(px - cx, py - cy - N * 0.02);
      const ringA = smoothstep(W + N * 0.008, W - N * 0.008, Math.abs(dist - R));
      if (ringA > 0) {
        const ang = Math.atan2(px - cx, -(py - cy)); // 0 arriba, horario
        const [fr, fg, fb] = gradient(RING_STOPS, ang / (2 * Math.PI));
        const na = ringA;
        r = lerp(r, fr, na); g = lerp(g, fg, na); b = lerp(b, fb, na);
        a = Math.max(a, na);
      }
      // llama (gota): centro un poco abajo del centro
      const fx = (px - cx) / (N * 0.115);
      const fy = (py - (cy + N * 0.075)) / (N * 0.165);
      const widen = 1 + 0.45 * Math.max(0, -fy);
      const d = (fx * fx) / (widen * widen) + fy * fy * (1 - 0.18 * Math.max(0, fy));
      const flameA = 1 - smoothstep(0.86, 1.0, d);
      if (flameA > 0) {
        const t = Math.min(1, Math.max(0, (fy + 1) / 2)); // 0 abajo → 1 arriba
        const [fr, fg, fb] = gradient(FLAME_STOPS, 1 - t * 0 + (1 - t) * 0 + (1 - (t))); // invertido: abajo verde
        r = lerp(r, fr, flameA); g = lerp(g, fg, flameA); b = lerp(b, flameA ? fb : b, flameA);
        a = Math.max(a, flameA);
        // brillo interior
        const hx = (px - (cx - N * 0.03)) / (N * 0.05);
        const hy = (py - (cy - N * 0.01)) / (N * 0.075);
        const hi = (1 - smoothstep(0.4, 1.0, hx * hx + hy * hy)) * 0.35 * flameA;
        r = lerp(r, 255, hi); g = lerp(g, 255, hi); b = lerp(b, 255, hi);
      }
      const i = (y * N + x) * 4;
      buf[i] = Math.round(r); buf[i + 1] = Math.round(g); buf[i + 2] = Math.round(b); buf[i + 3] = Math.round(a * 255);
    }
  }
  return buf;
}

function downsample(src, S, D) {
  const out = Buffer.alloc(D * D * 4);
  const k = S / D;
  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = Math.floor(y * k); sy < Math.ceil((y + 1) * k); sy++) {
        for (let sx = Math.floor(x * k); sx < Math.ceil((x + 1) * k); sx++) {
          const i = (sy * S + sx) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++;
        }
      }
      const i = (y * D + x) * 4;
      out[i] = Math.round(r / n); out[i + 1] = Math.round(g / n); out[i + 2] = Math.round(b / n); out[i + 3] = Math.round(a / n);
    }
  }
  return out;
}

// ---------- PNG ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
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
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- ICO ----------
function buildIco(pngs) {
  const n = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(n, 4);
  const entries = [];
  let offset = 6 + 16 * n;
  const parts = [header];
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
    offset += data.length;
    parts.push(e);
    entries.push(data);
  }
  return Buffer.concat([...parts, ...entries]);
}

// ---------- main ----------
const full = paint(SIZE);
const sizes = [256, 64, 48, 32, 16];
const pngs = sizes.map((s) => ({
  size: s,
  data: encodePng(s === SIZE ? full : downsample(full, SIZE, s), s),
}));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buildIco(pngs));
console.log('Icono creado:', OUT, fs.statSync(OUT).size, 'bytes');
