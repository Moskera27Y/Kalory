import { motion } from 'framer-motion';
import Logo from './Logo';

/** Pantalla de apertura: anillo cónico giratorio, ondas expansivas y brillo. */
export default function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
      exit={{ opacity: 0, scale: 1.12, filter: 'blur(10px)' }}
      transition={{ duration: 0.35, ease: 'easeIn' }}
    >
      <div className="relative flex items-center justify-center">
        {/* anillo cónico giratorio */}
        <motion.div
          className="absolute h-64 w-64 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, rgba(16,185,129,0.5), rgba(245,158,11,0.35), rgba(239,68,68,0.4), rgba(16,185,129,0.5))', filter: 'blur(28px)' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
        />
        {/* ondas expansivas */}
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute h-40 w-40 rounded-full border border-emerald/40"
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: [0.6, 1.9], opacity: [0.8, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, delay: i * 1.1, ease: 'easeOut' }}
          />
        ))}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 15 }}
          className="relative"
        >
          <motion.div
            className="absolute -inset-10 rounded-full bg-gradient-to-r from-emerald/30 via-fire/25 to-fire-hot/25 blur-2xl"
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          />
          <div className="relative origin-center scale-[2.2]">
            <Logo size={72} withText={false} />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
        className="relative mt-14 text-center"
      >
        <span className="relative inline-block overflow-hidden font-display text-4xl font-extrabold tracking-tight">
          Kalory
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', repeatDelay: 0.4 }}
          />
        </span>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-1 text-sm uppercase tracking-[0.25em] text-muted"
        >
          Health &amp; Fitness
        </motion.p>
      </motion.div>

      <motion.div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#10B981] via-[#F59E0B] to-[#EF4444]"
          animate={{ x: ['-100%', '400%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  );
}
