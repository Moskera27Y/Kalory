import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="min-h-full w-full"
    >
      {children}
    </motion.div>
  );
}

export function GlassCard({ children, className = '', glow = false }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`glass p-5 ${glow ? 'card-glow-emerald' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
