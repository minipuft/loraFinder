// Type alias for clarity
type TweenVars = gsap.TweenVars;

// Define the structure for a GSAP animation configuration
export interface GsapConfig {
  defaults?: gsap.TweenVars; // Optional defaults for all tweens using this config
  vars: gsap.TweenVars; // Main animation properties
  initialVars?: gsap.TweenVars; // Optional initial state (set before animation)
}

// --- GSAP Configuration Objects ---
export const gsapConfigs: Record<string, GsapConfig> = {
  fadeIn: {
    initialVars: { opacity: 0 },
    vars: { opacity: 1, duration: 0.5, ease: 'power2.out' },
  },
  hoverPop: {
    // initialVars: { scale: 1 }, // Not strictly needed if default is 1
    vars: {
      scale: 1.05,
      duration: 0.2,
      ease: 'back.out(1.7)',
      overwrite: 'auto', // Prevent conflicts if re-hovered quickly
    },
    defaults: { transformOrigin: 'center center' }, // Ensure scaling is centered
  },
  instant: {
    // For instantly applying a state, useful for setup or cleanup
    vars: { duration: 0 }, // Setting duration to 0 makes it instant
  },
  // --- ROW PRESETS --- >
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
      opacity: 0.7, // Dim the source row slightly
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    },
  },
  // < --- END ROW PRESETS ---

  // --- ITEM PRESETS ---
  itemDragStart: {
    vars: {
      // scale: 1.06, // Remove or reduce scale significantly
      // y: -4, // Remove lift
      opacity: 0.85, // Make slightly transparent
      boxShadow: '0 0 15px 2px rgba(255, 255, 255, 0.25)', // Soft white glow
      zIndex: 100,
      duration: 0.2, // Slightly longer duration for the transition
      ease: 'power2.out',
    },
    defaults: { transformOrigin: 'center center' }, // Keep for safety if scale is added back
  },
  itemDropTargetHighlight: {
    vars: {
      boxShadow: '0 0 12px rgba(59, 130, 246, 0.7)', // Brighter blue glow
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
  // --- END ITEM PRESETS ---
};
