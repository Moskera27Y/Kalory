import type { Variants } from 'framer-motion';

/** Sistema de motion compartido: entradas escalonadas y físicas de resorte. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 210, damping: 24 },
  },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
};

export const pulseGlow = {
  animate: { opacity: [0.55, 1, 0.55], scale: [0.97, 1.03, 0.97] },
  transition: { repeat: Infinity, duration: 3.2, ease: 'easeInOut' as const },
};
