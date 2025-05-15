import { gsap } from 'gsap';
import { gsapConfigs } from './presets';

// Define the structure for a step in the pipeline
interface AnimationStepOptions {
  delay?: number | string; // GSAP delay or position parameter like "+=0.5"
  // duration?: number; // Removed: Will be part of vars
  // ease?: string;   // Removed: Will be part of vars
  // Add other potential GSAP overrides if needed
}

interface AnimationStep {
  id?: string; // Optional ID for the step
  target: gsap.DOMTarget | object; // MODIFIED: Allow plain objects for non-DOM animations
  preset: keyof typeof gsapConfigs | 'none'; // Use keys from gsapConfigs directly OR 'none'
  // options?: AnimationStepOptions; // Removed: Replace with vars
  vars?: gsap.TweenVars; // Allow any GSAP vars to be passed
  position?: number | string; // Optional: GSAP position parameter (like "+=0.5", replaces delay in options)
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

    const { target, preset, vars = {}, position } = step;

    let tweenVars: gsap.TweenVars = { ...vars }; // Start with step-specific vars
    let initialTweenVars: gsap.TweenVars | undefined = undefined;

    if (preset !== 'none') {
      const presetConfig = gsapConfigs[preset];

      if (!presetConfig) {
        console.warn(`[AnimationPipeline] Preset "${preset}" not found in gsapConfigs.`);
        // If preset is required, you might return here or throw an error
        // If vars alone are acceptable, we can proceed with just those.
      } else {
        // Combine defaults, preset vars, and step vars
        tweenVars = {
          ...presetConfig.defaults, // Start with preset defaults
          ...presetConfig.vars, // Layer preset main variables
          ...vars, // Layer step-specific overrides
        };

        // Handle initial state if the preset defines it
        // This part primarily applies to DOMTargets where presets often define starting states.
        // For generic object targets with preset: 'none', initialVars are less common
        // and GSAP's .to() will tween from current values.
        if (hasInitialVars(presetConfig)) {
          // We might need to be careful if target is not a DOMTarget here,
          // but gsap.set is also flexible. For now, no explicit check.
          initialTweenVars = presetConfig.initialVars;
        }
      }
    }

    // Apply initial state if defined
    // gsap.set is flexible; it can set properties on plain objects too.
    // However, this is typically for presets. If preset is 'none' and target is an object,
    // initialTweenVars will likely be undefined, and GSAP tweens from current state.
    if (initialTweenVars && typeof target === 'object' && target !== null) {
      // Added a check for target being an object
      gsap.set(target, initialTweenVars);
    }

    // Add the tween to the timeline
    // GSAP's .to() is flexible with target types (DOM elements, selectors, or generic objects)
    this.timeline.to(target, tweenVars, position);
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

  /**
   * Clears all tweens and labels from the timeline without killing it.
   * Useful for reconfiguring a pipeline without destroying the instance.
   */
  clear(): this {
    this.timeline?.clear(); // Use GSAP's clear method
    this.steps = []; // Also clear our internal step tracking
    return this;
  }

  // --- Future additions ---
  // addFramerStep(...) - To control Framer Motion components
  // addSpringStep(...) - To integrate react-spring
  // seek() - To jump to a specific time/label
  // progress() - To get/set progress
}
