import { motion, useSpring, useTransform, useMotionValue, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const rounded = useTransform(spring, (v) => `${Math.round(v).toLocaleString('es')}${suffix}`);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView) mv.set(value);
  }, [value, inView, mv]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

export function ActivityRings({ consumed, target, burned }: { consumed: number; target: number; burned: number }) {
  const pct = Math.min(1, consumed / Math.max(1, target));
  const burnPct = Math.min(1, burned / 800);
  const R = 70;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald/15 to-fire/10 blur-xl" />
      <svg viewBox="0 0 180 180" className="relative h-full w-full -rotate-90">
        <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="13" />
        <circle cx="90" cy="90" r={R - 18} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <motion.circle
          cx="90" cy="90" r={R} fill="none" stroke="url(#g-em)" strokeWidth="13" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 50, damping: 18 }}
        />
        <motion.circle
          cx="90" cy="90" r={R - 18} fill="none" stroke="url(#g-fire)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * (R - 18)} initial={{ strokeDashoffset: 2 * Math.PI * (R - 18) }}
          animate={{ strokeDashoffset: 2 * Math.PI * (R - 18) * (1 - burnPct) }}
          transition={{ type: 'spring', stiffness: 50, damping: 18, delay: 0.15 }}
        />
        <defs>
          <linearGradient id="g-em" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="g-fire" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold font-display"><AnimatedCounter value={consumed} /></span>
        <span className="text-xs text-muted">de {target.toLocaleString('es')} kcal</span>
      </div>
    </div>
  );
}

const BOTTLES = [100, 250, 330, 500, 750];

export function WaterTracker({ ml, goal, onAdd }: { ml: number; goal: number; onAdd: (ml: number) => void }) {
  const [custom, setCustom] = useState('250');
  const pct = Math.min(1, ml / Math.max(1, goal));
  const glasses = ml / 250;

  const addCustom = () => {
    const v = Math.round(Number(custom));
    if (Number.isFinite(v) && v !== 0 && Math.abs(v) <= 3000) {
      onAdd(v);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <motion.div
          className="absolute bottom-0 w-full bg-gradient-to-t from-[#059669] to-[#34D399]/80"
          initial={false}
          animate={{ height: `${Math.max(5, pct * 100)}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        >
          <div className="absolute -top-2 h-4 w-full rounded-[50%] bg-[#34D399]/60 blur-[1px]" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold drop-shadow">{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold">{(ml / 1000).toFixed(2)} L <span className="text-muted font-normal">/ {(goal / 1000).toFixed(2)} L</span></p>
        <p className="text-xs text-muted">≈ {glasses.toFixed(1)} vasos de 250 ml</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BOTTLES.map((v) => (
            <motion.button key={v} whileTap={{ scale: 0.9 }} onClick={() => onAdd(v)}
              className="chip !px-2.5 !py-1.5 !text-xs hover:border-emerald/50 hover:text-emerald">+{v}</motion.button>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            type="number" min={-3000} max={3000} value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
            className="input-kalory !py-1.5 !px-3 !text-xs w-24"
            placeholder="ml"
          />
          <button onClick={addCustom} className="chip !py-1.5 !text-xs !border-emerald/40 text-emerald">Añadir ml</button>
          <button onClick={() => onAdd(-250)} title="Corregir: restar 250 ml" className="chip !py-1.5 !text-xs text-muted">−250</button>
        </div>
      </div>
    </div>
  );
}
