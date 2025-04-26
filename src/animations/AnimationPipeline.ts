import { gsap } from 'gsap';
import { MotionPresetName, gsapConfigs } from './motionPresets';

// Define the structure for a step in the pipeline
interface AnimationStepOptions {
  delay?: number | string; // GSAP delay or position parameter like "+=0.5"
  duration?: number;
  ease?: string;
  // Add other potential GSAP overrides if needed
}

interface AnimationStep {
  id?: string; // Optional ID for the step
  target: gsap.DOMTarget; // Element(s) to animate
  preset: MotionPresetName; // Name of the preset to use
  options?: AnimationStepOptions; // Overrides for this specific step
  // Later: Add 'type' for spring vs preset, 'engine' for Framer vs GSAP
}

// Type guard to check if a config has initialVars
function hasInitialVars(config: any): config is { initialVars: gsap.TweenVars } {
  return config && typeof config === 'object' && 'initialVars' in config;
}

export class AnimationPipeline {
  private timeline: gsap.core.Timeline | null;
  private steps: AnimationStep[] = []; // Keep track of added steps

  constructor(options?: gsap.TimelineVars) {
    this.timeline = gsap.timeline({
      paused: true, // Default to paused, require explicit play()
      smoothChildTiming: true,
      ...options,
    });
  }

  /**
   * Adds an animation step to the pipeline based on a preset.
   */
  addStep(step: AnimationStep): this {
    if (!this.timeline) return this; // Don't add if killed

    const { target, preset, options = {} } = step;
    const presetConfig = gsapConfigs[preset];

    if (!presetConfig) {
      console.warn(`[AnimationPipeline] Preset "${preset}" not found in gsapConfigs.`);
      return this;
    }

    // Combine defaults, step options, and preset variables
    const tweenVars: gsap.TweenVars = {
      ...presetConfig.defaults,
      ...options,
      ...presetConfig.vars,
    };

    // Handle initial state using the type guard
    if (hasInitialVars(presetConfig)) {
      gsap.set(target, presetConfig.initialVars);
    }

    // Add the tween to the timeline
    this.timeline.to(target, tweenVars, options?.delay);
    this.steps.push(step); // Store the step definition

    return this; // Allow chaining
  }

  /**
   * Plays the animation pipeline from the current position.
   */
  play(): Promise<void> {
    if (!this.timeline) return Promise.resolve(); // Handle killed timeline
    // Return a promise that resolves when the timeline completes
    return new Promise(resolve => {
      // Ensure timeline exists before setting callback
      if (!this.timeline) {
        resolve();
        return;
      }
      this.timeline.eventCallback('onComplete', () => {
        resolve();
        this.timeline?.eventCallback('onComplete', null); // Clean up listener safely
      });
      this.timeline.play();
    });
  }

  /**
   * Pauses the animation pipeline.
   */
  pause(): this {
    this.timeline?.pause(); // Use optional chaining
    return this;
  }

  /**
   * Reverses the animation pipeline from the current position.
   */
  reverse(): Promise<void> {
    if (!this.timeline) return Promise.resolve(); // Handle killed timeline
    return new Promise(resolve => {
      if (!this.timeline) {
        resolve();
        return;
      }
      this.timeline.eventCallback('onReverseComplete', () => {
        resolve();
        this.timeline?.eventCallback('onReverseComplete', null); // Clean up listener safely
      });
      this.timeline.reverse();
    });
  }

  /**
   * Restarts the animation pipeline from the beginning.
   */
  restart(): Promise<void> {
    if (!this.timeline) return Promise.resolve(); // Handle killed timeline
    this.timeline.pause(); // Ensure it's paused before restarting
    this.timeline.seek(0);
    return this.play(); // play() already handles killed timeline
  }

  /**
   * Kills the timeline and removes tweens, freeing resources.
   * Should be called when the component using the pipeline unmounts.
   */
  kill(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null; // Set to null after killing
    }
    this.steps = [];
  }

  // --- Future additions ---
  // addFramerStep(...) - To control Framer Motion components
  // addSpringStep(...) - To integrate react-spring
  // clear() - To remove steps without killing the timeline instance
  // seek() - To jump to a specific time/label
  // progress() - To get/set progress
}
