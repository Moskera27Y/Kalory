import { useEffect, useRef } from 'react';

/**
 * Fondo vivo: auroras intensas a la deriva + polvo luminoso ascendente.
 * DPR-aware, se pausa si la pestaña se oculta o hay prefers-reduced-motion.
 */
const BLOBS = [
  { x: 0.10, y: 0.06, r: 0.48, c: '16,185,129', a: 0.42, sx: 0.034, sy: 0.022, p: 0.0 },
  { x: 0.94, y: 0.16, r: 0.52, c: '245,158,11', a: 0.34, sx: -0.028, sy: 0.019, p: 2.1 },
  { x: 0.55, y: 1.04, r: 0.56, c: '239,68,68', a: 0.26, sx: 0.020, sy: -0.016, p: 4.2 },
  { x: 0.84, y: 0.86, r: 0.38, c: '5,150,105', a: 0.30, sx: -0.018, sy: 0.024, p: 1.2 },
  { x: 0.28, y: 0.58, r: 0.32, c: '52,211,153', a: 0.18, sx: 0.024, sy: -0.020, p: 3.0 },
  { x: 0.45, y: 0.30, r: 0.30, c: '251,146,60', a: 0.14, sx: -0.026, sy: 0.015, p: 5.1 },
  { x: 0.05, y: 0.75, r: 0.34, c: '16,185,129', a: 0.20, sx: 0.019, sy: -0.021, p: 0.7 },
];

const DUST = 46;

export default function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    const dust = Array.from({ length: DUST }, (_, i) => ({
      x: ((i * 173) % 100) / 100,
      y: ((i * 311) % 100) / 100,
      r: 0.8 + ((i * 7) % 12) / 8,
      v: 0.006 + ((i * 13) % 10) / 1400,
      tw: (i * 37) % 100 / 100 * Math.PI * 2,
      emerald: i % 3 !== 0,
    }));

    const t0 = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const time = (t - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.max(w, h);
      for (const b of BLOBS) {
        const x = (b.x + Math.sin(time * b.sx * 8 + b.p) * 0.07) * w;
        const y = (b.y + Math.cos(time * b.sy * 8 + b.p) * 0.07) * h;
        const r = b.r * R * (1 + Math.sin(time * 0.3 + b.p) * 0.06);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${b.c},${b.a})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      for (const d of dust) {
        const y = ((d.y - time * d.v) % 1 + 1) % 1;
        const alpha = 0.12 + 0.12 * Math.sin(time * 1.4 + d.tw);
        ctx.beginPath();
        ctx.arc(d.x * w, y * h, d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.emerald ? `rgba(52,211,153,${Math.max(0, alpha)})` : `rgba(251,191,36,${Math.max(0, alpha)})`;
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0" aria-hidden />;
}
