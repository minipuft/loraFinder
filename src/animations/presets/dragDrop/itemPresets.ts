import type { GsapConfig } from '../types';

export const itemPresets: Record<string, GsapConfig> = {
  itemDragStart: {
    vars: {
      opacity: 0.85,
      boxShadow: '0 0 15px 2px rgba(255, 255, 255, 0.25)',
      zIndex: 100,
      duration: 0.2,
      ease: 'power2.out',
    },
    defaults: { transformOrigin: 'center center' },
  },
  itemDropTargetHighlight: {
    vars: {
      boxShadow: '0 0 12px rgba(59, 130, 246, 0.7)',
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    },
    defaults: { transformOrigin: 'center center' },
  },
  itemDropTargetNormal: {
    vars: {
      scale: 1,
      rotate: 0,
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
      opacity: 1,
      duration: 0.4,
      ease: 'circ.out',
      overwrite: 'auto',
      clearProps: 'zIndex,boxShadow',
    },
    defaults: { transformOrigin: 'center center' },
  },
  showIndicator: {
    vars: {
      opacity: 1,
      scaleX: 1,
      duration: 0.25,
      ease: 'power3.out',
      overwrite: 'auto',
    },
    initialVars: { opacity: 0, scaleX: 0 },
    defaults: { transformOrigin: 'center center' },
  },
  hideIndicator: {
    vars: {
      opacity: 0,
      scaleX: 0,
      duration: 0.2,
      ease: 'power2.in',
      overwrite: 'auto',
    },
    defaults: { transformOrigin: 'center center' },
  },
  itemPassiveHoverStart: {
    defaults: { duration: 0.25, ease: 'power1.out', overwrite: 'auto' },
    vars: {
      scale: 1.02,
    },
  },
  itemPassiveHoverEnd: {
    defaults: { duration: 0.3, ease: 'power1.inOut', overwrite: 'auto' },
    vars: {
      scale: 1,
      clearProps: 'scale,filter,boxShadow',
    },
  },
  itemDropTargetHoverStart: {
    defaults: { duration: 0.2, ease: 'power2.out', overwrite: 'auto' },
    vars: {
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.7)',
      scale: 1.03,
    },
  },
  itemDropTargetHoverEnd: {
    defaults: { duration: 0.3, ease: 'power2.inOut', overwrite: 'auto' },
    vars: {
      scale: 1,
      clearProps: 'scale,filter,boxShadow',
    },
  },
  instant: {
    defaults: { duration: 0, overwrite: 'auto' },
    vars: {},
  },
};
