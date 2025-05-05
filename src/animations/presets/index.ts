import { itemPresets } from './dragDrop/itemPresets';
import { rowPresets } from './dragDrop/rowPresets';
import type { GsapConfig } from './types';
import { motionVariants as framerMotionVariants } from './uiEffects/framerPresets'; // Rename for clarity
import { generalGsapPresets } from './uiEffects/generalGsapPresets';
import * as globalEffects from './uiEffects/globalEffects'; // Import the new global effects

// Combine all GSAP presets into a single object for AnimationPipeline
export const gsapConfigs: Record<string, GsapConfig> = {
  ...generalGsapPresets,
  ...rowPresets,
  ...itemPresets,
  ...globalEffects, // Spread the new global effects
};

// Re-export Framer Motion variants (potentially renamed for clarity)
export const motionVariants = framerMotionVariants;

// Re-export shared types if needed elsewhere
export type { GsapConfig };
