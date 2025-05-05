import { Variants } from 'framer-motion';

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

// We might need a type for the preset names if MotionPreset.tsx uses it,
// but since it's unused, we can omit it for now.
// export type FramerPresetName = keyof typeof motionVariants;
