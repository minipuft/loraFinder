import { Variants } from 'framer-motion';

// --- Framer Motion Variants ---

export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  } satisfies Variants,

  hoverPop: {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
  } satisfies Variants,

  // Add more presets as needed...
};
