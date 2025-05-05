import type { GsapConfig } from '../types';

export const generalGsapPresets: Record<string, GsapConfig> = {
  fadeIn: {
    initialVars: { opacity: 0 },
    vars: { opacity: 1, duration: 0.5, ease: 'power2.out' },
  },
  hoverPop: {
    vars: {
      scale: 1.05,
      duration: 0.2,
      ease: 'back.out(1.7)',
      overwrite: 'auto',
    },
    defaults: { transformOrigin: 'center center' },
  },
  instant: {
    vars: { duration: 0 },
  },
};
