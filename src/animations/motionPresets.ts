import { Variants } from 'framer-motion';

// Type alias for clarity
type TweenVars = gsap.TweenVars;

// --- Framer Motion Variants ---

export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    // Transition properties are typically applied on the motion component itself
    // or within the transition prop, not directly in the variant definition.
  } satisfies Variants,

  hoverPop: {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    // Transition properties like stiffness/damping go on the motion component
  } satisfies Variants,

  // Add more presets as needed...
  // e.g., enterFromBottom, slideInLeft, pulse, etc.
};

// --- GSAP Configuration Objects ---
// Note: These are simplified examples. You might need more complex configs
// depending on how you integrate them into the pipeline later.

export const gsapConfigs = {
  fadeIn: {
    defaults: { duration: 0.5, ease: 'power2.out' },
    vars: { opacity: 1, y: 0 },
    initialVars: { opacity: 0, y: 10 }, // For setting initial state if needed
  } satisfies { defaults?: TweenVars; vars: TweenVars; initialVars?: TweenVars },

  hoverPop: {
    defaults: { duration: 0.3, ease: 'power2.out', overwrite: 'auto' },
    vars: { scale: 1.05 },
    // You might need a 'rest' state config for GSAP hover-off
    restVars: { scale: 1 },
  } satisfies { defaults?: TweenVars; vars: TweenVars; restVars?: TweenVars },

  // Add corresponding GSAP configs...
  instant: {
    defaults: {}, // No default duration/ease
    vars: {}, // All properties will be provided via options
  } satisfies { defaults?: TweenVars; vars: TweenVars },
};

// --- Combined Type for Preset Names (ensures consistency) ---
export type MotionPresetName = keyof typeof motionVariants & keyof typeof gsapConfigs;

// Helper function to get variants (example, might not be needed long-term)
export const getMotionVariant = (name: MotionPresetName): Variants => {
  return motionVariants[name];
};

// Helper function to get GSAP config (example)
export const getGsapConfig = (name: MotionPresetName) => {
  return gsapConfigs[name];
};
