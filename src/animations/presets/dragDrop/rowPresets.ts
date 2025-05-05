import type { GsapConfig } from '../types';

export const rowPresets: Record<string, GsapConfig> = {
  rowHoverEnter: {
    vars: {
      scale: 1.01,
      duration: 0.3,
      ease: 'circ.out',
      overwrite: 'auto',
    },
    defaults: { transformOrigin: 'center center' },
  },
  rowHoverLeave: {
    vars: {
      scale: 1,
      duration: 0.35,
      ease: 'circ.inOut',
      overwrite: 'auto',
    },
    defaults: { transformOrigin: 'center center' },
  },
  rowDragSourceActive: {
    vars: {
      opacity: 0.7,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    },
  },
};
