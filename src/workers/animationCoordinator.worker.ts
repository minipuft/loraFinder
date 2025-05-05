import * as Comlink from 'comlink';
import type {
  AnimationSequenceConfig,
  AnimationStepInstruction,
  CompletionCallback,
  ProgressCallback,
  StepExecutionCallback,
} from '../types';

// Add specific properties expected in the config for image feed
interface ImageFeedSequenceConfig extends AnimationSequenceConfig {
  itemIds: string[];
  layoutMode?: string; // e.g., ViewMode.GRID
}

console.log('[AnimCoordinatorWorker] Worker script loaded.');

export class AnimationCoordinatorApi {
  // Store callbacks provided by the main thread, keyed by sequence ID
  private progressCallbacks = new Map<string, Comlink.Remote<ProgressCallback>>();
  private stepCallbacks = new Map<string, Comlink.Remote<StepExecutionCallback>>();
  private completionCallbacks = new Map<string, Comlink.Remote<CompletionCallback>>();

  constructor() {
    console.log('[AnimCoordinatorWorker] API Instantiated.');
  }

  ping(message: string): string {
    console.log(`[AnimCoordinatorWorker] Received ping: ${message}`);
    return `pong - ${message}`;
  }

  /**
   * Starts processing an animation sequence.
   * The main thread provides callbacks to receive instructions and updates.
   */
  async startSequence(
    // Use the more specific config type
    config: ImageFeedSequenceConfig,
    onProgress: ProgressCallback,
    onStepExecute: StepExecutionCallback,
    onComplete: CompletionCallback
  ): Promise<void> {
    // Return void, signal completion via callback
    const { id: sequenceId, itemIds = [] } = config;
    console.log(
      `[Worker] Starting sequence processing: ${sequenceId} for ${itemIds.length} items.`
    );

    // Store proxied callbacks
    // Comlink.proxy() ensures functions passed from the main thread are callable
    // @ts-expect-error - Comlink internally wraps the return type in a Promise
    this.progressCallbacks.set(sequenceId, Comlink.proxy(onProgress));
    // @ts-expect-error - Comlink internally wraps the return type in a Promise
    this.stepCallbacks.set(sequenceId, Comlink.proxy(onStepExecute));
    // @ts-expect-error - Comlink internally wraps the return type in a Promise
    this.completionCallbacks.set(sequenceId, Comlink.proxy(onComplete));

    try {
      // --- Image Feed Initial Animation Logic --- //

      // 1. Generate animation steps based on itemIds
      const steps: AnimationStepInstruction[] = itemIds.map((itemId, index) => {
        // Simple stagger calculation (can be made more complex)
        const stagger = index * 0.03; // 30ms stagger per item
        return {
          // Use the data attribute selector
          targetSelector: `[data-image-id="${itemId}"]`,
          preset: 'fadeInUp', // Use a preset defined in presets/index.ts
          vars: { duration: 0.4, ease: 'power2.out' }, // Optional overrides
          position: `+=${stagger}`, // Position relative to the previous step
        };
      });

      // Ensure the first step starts immediately if using relative positioning
      if (
        steps.length > 0 &&
        typeof steps[0].position === 'string' &&
        steps[0].position.startsWith('+')
      ) {
        steps[0].position = steps[0].position.substring(2); // Remove leading += for the first item
      }

      const totalSteps = steps.length;
      this.progressCallbacks.get(sequenceId)?.(sequenceId, 0); // Start progress at 0
      if (totalSteps === 0) {
        // Handle case with no items
        console.log(`[Worker] No items to animate for sequence: ${sequenceId}`);
        this.completionCallbacks.get(sequenceId)?.(sequenceId, true, 'No items to animate.');
        // Clean up immediately
        this.progressCallbacks.delete(sequenceId);
        this.stepCallbacks.delete(sequenceId);
        this.completionCallbacks.delete(sequenceId);
        return;
      }

      // 2. Send step instructions back to the main thread via callback
      for (let i = 0; i < totalSteps; i++) {
        const step = steps[i];
        console.log(
          `[Worker] Sending step ${i + 1}/${totalSteps} for sequence ${sequenceId}:`,
          step
        );
        this.stepCallbacks.get(sequenceId)?.(sequenceId, step);

        // Simulate time between steps / more work
        await new Promise(res => setTimeout(res, 50));
        const progress = (i + 1) / totalSteps;
        this.progressCallbacks.get(sequenceId)?.(sequenceId, progress); // Update progress
      }

      // 3. Signal successful completion
      console.log(`[Worker] Sequence completed successfully: ${sequenceId}`);
      this.completionCallbacks.get(sequenceId)?.(
        sequenceId,
        true,
        'Sequence processed successfully.'
      );
    } catch (error) {
      console.error(`[Worker] Error processing sequence ${sequenceId}:`, error);
      // Signal failure
      this.completionCallbacks.get(sequenceId)?.(
        sequenceId,
        false,
        error instanceof Error ? error.message : 'Unknown worker error'
      );
    } finally {
      // 4. Clean up callbacks for this sequence ID regardless of success/failure
      this.progressCallbacks.delete(sequenceId);
      this.stepCallbacks.delete(sequenceId);
      this.completionCallbacks.delete(sequenceId);
      console.log(`[Worker] Cleaned up callbacks for sequence: ${sequenceId}`);
    }
  }

  // TODO: Add methods for canceling sequences if needed
  // cancelSequence(sequenceId: string): void { ... }
}

// Expose the API to the main thread
Comlink.expose(new AnimationCoordinatorApi());

// Optional: Handle potential unhandled rejections in the worker
self.addEventListener('unhandledrejection', event => {
  console.error('[AnimCoordinatorWorker] Unhandled rejection:', event.reason);
});
