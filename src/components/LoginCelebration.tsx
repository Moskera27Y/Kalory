import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const DOTS = Array.from({ length: 14 }, (_, i) => ({
  left: 8 + ((i * 67) % 84),
  size: 4 + ((i * 5) % 5),
  delay: (i % 7) * 0.18,
  dur: 1.6 + ((i * 3) % 10) / 8,
  emerald: i % 3 !== 0,
}));

/** Celebración post-login: check con ondas, saludo y partículas ascendentes. */
export default function LoginCelebration({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B16]/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(6px)' }}
      transition={{ duration: 0.35 }}
    >
      <div className="relative flex items-center justify-center">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute h-28 w-28 rounded-full border-2 border-emerald/50"
            initial={{ scale: 0.5, opacity: 0.9 }}
            animate={{ scale: [0.5, 2.1], opacity: [0.9, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.9, ease: 'easeOut' }}
          />
        ))}
        <motion.div
          className="absolute -inset-8 rounded-full bg-gradient-to-r from-emerald/30 via-fire/20 to-fire-hot/25 blur-2xl"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
        />
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-glow-emerald"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 16 }}
          >
            <Check size={44} strokeWidth={3} />
          </motion.span>
        </motion.span>
      </div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 140, damping: 18 }}
        className="mt-8 px-6 text-center font-display text-4xl font-extrabold tracking-tight"
      >
        ¡Hola, <span className="text-gradient-emerald">{name.split(' ')[0]}</span>!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="mt-2 text-sm text-muted"
      >
        Sesión iniciada · Preparando todo para ti…
      </motion.p>

      {/* partículas ascendentes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {DOTS.map((d, i) => (
          <motion.span
            key={i}
            className={`absolute bottom-[18%] rounded-full ${d.emerald ? 'bg-emerald' : 'bg-fire'}`}
            style={{ left: `${d.left}%`, width: d.size, height: d.size }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -320, opacity: [0, 1, 0] }}
            transition={{ duration: d.dur, delay: 0.3 + d.delay, ease: 'easeOut' }}
          />
        ))}
      </div>
    </motion.div>
  );
}
