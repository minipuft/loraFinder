/**
 * Represents a single instruction for an animation step,
 * to be sent from the worker to the main thread.
 */
export interface AnimationStepInstruction {
  /** Unique identifier for the step, if needed */
  id?: string;
  /** CSS selector for the main thread to find the target element(s) */
  targetSelector: string;
  /** Name of the GSAP preset (key in gsapConfigs) or 'none' */
  preset: string; // TODO: Ideally use keyof typeof gsapConfigs, but that requires complex setup
  /** GSAP variables object to override or supplement preset vars */
  vars?: Record<string, any>; // Corresponds to gsap.TweenVars
  /** GSAP timeline position parameter (e.g., 0, '+=0.5', 'myLabel') */
  position?: number | string;
  // Add other relevant details needed by the main thread's AnimationPipeline.addStep
}

/**
 * Configuration object for initiating an animation sequence via the worker.
 */
export interface AnimationSequenceConfig {
  /** Unique identifier for this specific animation sequence instance */
  id: string;
  /** Optional description or type of sequence */
  type?: string;
  /** Optional layout mode context (e.g., ViewMode.GRID) */
  layoutMode?: string;
  // Add other configuration parameters needed by the worker to generate the steps
  // e.g., numberOfItems?: number;
  // e.g., layoutMode?: 'grid' | 'list';
}

/**
 * Type definition for a callback function to report progress.
 * @param sequenceId - The ID of the sequence reporting progress.
 * @param progress - A value between 0 and 1.
 */
export type ProgressCallback = (sequenceId: string, progress: number) => void;

/**
 * Type definition for a callback function to request execution of an animation step.
 * @param sequenceId - The ID of the sequence this step belongs to.
 * @param step - The instruction object for the animation step.
 */
export type StepExecutionCallback = (sequenceId: string, step: AnimationStepInstruction) => void;

/**
 * Type definition for a callback function to signal sequence completion.
 * @param sequenceId - The ID of the completed sequence.
 * @param success - Whether the sequence completed successfully.
 * @param message - Optional completion message or error details.
 */
export type CompletionCallback = (sequenceId: string, success: boolean, message?: string) => void;
