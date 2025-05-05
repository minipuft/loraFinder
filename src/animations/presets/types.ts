// Type alias for clarity
export type TweenVars = gsap.TweenVars;

// Define the structure for a GSAP animation configuration
export interface GsapConfig {
  defaults?: TweenVars; // Optional defaults for all tweens using this config
  vars: TweenVars; // Main animation properties
  initialVars?: TweenVars; // Optional initial state (set before animation)
}
