import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MoonStar, Play, Square } from 'lucide-react';
import { GlassCard } from './ui';
import { useStore } from '../lib/store';
import {
  PROTOCOLS, fastingState, setProtocol, startFast, stopFast, cancelFast,
  completedCount, fastingStreak,
} from '../lib/fasting';

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Widget de ayuno intermitente con anillo de progreso en vivo. */
export default function FastingWidget() {
  const { user, unlockMedal } = useStore();
  const [, force] = useState(0);
  const uid = user?.id ?? 0;

  const st = fastingState(uid);
  const proto = PROTOCOLS.find((p) => p.id === st.protocolId) ?? PROTOCOLS[2];
  const targetMs = proto.hours * 3600 * 1000;

  useEffect(() => {
    if (!st.activeStart) return;
    const id = window.setInterval(() => force((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [st.activeStart]);

  if (!user) return null;

  const elapsed = st.activeStart ? Date.now() - st.activeStart : 0;
  const pct = Math.min(1, elapsed / targetMs);
  const done = elapsed >= targetMs;
  const R = 54;
  const C = 2 * Math.PI * R;

  const finish = async () => {
    const rec = stopFast(uid);
    force((x) => x + 1);
    if (rec?.completed) {
      await unlockMedal('ayuno_1');
      if (completedCount(uid) >= 7) await unlockMedal('ayuno_7');
    }
  };

  return (
    <GlassCard glow className="glow-hover">
      <div className="flex items-center gap-2">
        <MoonStar size={17} className="text-fire" />
        <p className="text-xs uppercase tracking-widest text-muted">Ayuno intermitente</p>
        <span className="ml-auto rounded-full bg-fire/15 px-2 py-0.5 text-[11px] font-bold text-fire">{proto.label}</span>
      </div>

      <div className="relative mx-auto mt-2 h-[150px] w-[150px]">
        <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
          <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="11" />
          <motion.circle
            cx="65" cy="65" r={R} fill="none"
            stroke={done ? 'url(#fg-em)' : 'url(#fg-fire)'}
            strokeWidth="11" strokeLinecap="round" strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - pct) }}
            transition={{ type: 'spring', stiffness: 60, damping: 20 }}
          />
          <defs>
            <linearGradient id="fg-em" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="fg-fire" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-extrabold tabular-nums">{st.activeStart ? fmt(elapsed) : proto.hours + ':00:00'}</span>
          <span className="text-[11px] text-muted">{st.activeStart ? (done ? '¡Meta lista!' : 'en ayuno') : 'en espera'}</span>
        </div>
      </div>

      {st.activeStart ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={finish} className="btn-emerald !py-2 text-xs">Terminar</motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { cancelFast(uid); force((x) => x + 1); }} className="chip !py-2 !text-xs text-muted flex items-center justify-center gap-1">
            <Square size={12} /> Cancelar
          </motion.button>
        </div>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
            {PROTOCOLS.map((p) => (
              <button key={p.id} onClick={() => { setProtocol(uid, p.id); force((x) => x + 1); }}
                className={`chip !px-2.5 !py-1.5 !text-xs ${st.protocolId === p.id ? 'border-fire/60 bg-fire/15 text-white' : 'text-muted'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { startFast(uid); force((x) => x + 1); }} className="btn-fire mt-2 w-full !py-2.5 text-sm flex items-center justify-center gap-2">
            <Play size={15} /> Iniciar ayuno
          </motion.button>
        </>
      )}
      <p className="mt-2 text-center text-[11px] text-muted">
        {completedCount(uid)} ayunos · racha {fastingStreak(uid)} 🔥
      </p>
    </GlassCard>
  );
}
