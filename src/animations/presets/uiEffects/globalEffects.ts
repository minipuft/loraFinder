import { GsapConfig } from 'src/animations/presets/types'; // Correct type name is GsapConfig

// Preset to subtly indicate drag start (e.g., slight body dim)
export const dragStartGlow: GsapConfig = {
  defaults: { duration: 0.4, ease: 'power2.out' },
  vars: {
    // Targeting body might be too broad, consider a dedicated overlay/background element
    // For now, let's use opacity as an example
    opacity: 0.95, // Slightly dim the body
    // Example: box-shadow: 'inset 0 0 20px 5px rgba(59, 130, 246, 0.3)', // Inner glow
  },
};

// Preset to fade back after drag ends
export const dragEndFade: GsapConfig = {
  defaults: { duration: 0.5, ease: 'power2.inOut' },
  vars: {
    opacity: 1, // Restore full opacity
    // Example: boxShadow: 'none',
  },
};
