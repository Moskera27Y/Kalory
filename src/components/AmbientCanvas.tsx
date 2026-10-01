import { useEffect, useRef } from 'react';

/**
 * Fondo aurora animado en canvas: orbes esmeralda/ámbar/rojo a la deriva
 * + grano sutil. DPR-aware, se pausa si la pestaña se oculta o hay
 * prefers-reduced-motion. Sustituye a los resplandores estáticos.
 */
const BLOBS = [
  { x: 0.12, y: 0.08, r: 0.32, c: '16,185,129', a: 0.20, sx: 0.021, sy: 0.014, p: 0.0 },
  { x: 0.92, y: 0.18, r: 0.36, c: '245,158,11', a: 0.15, sx: -0.017, sy: 0.012, p: 2.1 },
  { x: 0.55, y: 1.02, r: 0.40, c: '239,68,68', a: 0.11, sx: 0.013, sy: -0.010, p: 4.2 },
  { x: 0.82, y: 0.85, r: 0.26, c: '5,150,105', a: 0.13, sx: -0.011, sy: 0.016, p: 1.2 },
  { x: 0.30, y: 0.55, r: 0.20, c: '52,211,153', a: 0.07, sx: 0.016, sy: -0.013, p: 3.0 },
];

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

    const t0 = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const time = (t - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.max(w, h);
      for (const b of BLOBS) {
        const x = (b.x + Math.sin(time * b.sx * 8 + b.p) * 0.06) * w;
        const y = (b.y + Math.cos(time * b.sy * 8 + b.p) * 0.06) * h;
        const r = b.r * R * (1 + Math.sin(time * 0.25 + b.p) * 0.05);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${b.c},${b.a})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
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
