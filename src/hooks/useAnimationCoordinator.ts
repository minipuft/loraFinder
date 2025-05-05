import * as Comlink from 'comlink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager';
import type {
  AnimationSequenceConfig,
  CompletionCallback,
  ProgressCallback,
  StepExecutionCallback,
} from '../types';

interface InternalWorkerApi {
  ping(message: string): Promise<string>;
  startSequence(
    config: AnimationSequenceConfig,
    onProgress: ProgressCallback,
    onStepExecute: StepExecutionCallback,
    onComplete: CompletionCallback
  ): Promise<void>;
}

import type { AnimationCoordinatorApi as WorkerApiType } from '../workers/animationCoordinator.worker';
export type { WorkerApiType as AnimationCoordinatorApi };

export function useAnimationCoordinator(animationScope: string = 'global') {
  const [api, setApi] = useState<Comlink.Remote<InternalWorkerApi> | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const comlinkApiRef = useRef<Comlink.Remote<InternalWorkerApi> | null>(null);

  const pipeline = useAnimationPipeline(animationScope);

  const handleProgress = useCallback<ProgressCallback>((sequenceId, currentProgress) => {
    setProgress(currentProgress);
  }, []);

  const handleStepExecute = useCallback<StepExecutionCallback>(
    (sequenceId, step) => {
      console.log(`[Hook] Executing step for ${sequenceId}:`, step);
      const targetElement = document.querySelector(step.targetSelector);

      if (!targetElement) {
        console.warn(
          `[Hook] Target element not found for step in sequence ${sequenceId}: ${step.targetSelector}`
        );
        return;
      }

      pipeline.addStep({
        target: targetElement,
        preset: step.preset as any,
        vars: step.vars,
        position: step.position,
      });
    },
    [pipeline]
  );

  const handleCompletion = useCallback<CompletionCallback>(
    (sequenceId, success, message) => {
      console.log(`[Hook] Sequence ${sequenceId} completed. Success: ${success}, Msg: ${message}`);
      setIsAnimating(false);
      setProgress(success ? 1 : progress);
      if (!success) {
        setError(new Error(message || `Animation sequence ${sequenceId} failed.`));
      }
    },
    [progress]
  );

  useEffect(() => {
    if (workerRef.current) return;

    console.log('[useAnimationCoordinator] Initializing worker...');
    setIsInitializing(true);
    setError(null);

    try {
      workerRef.current = new Worker(
        new URL('../workers/animationCoordinator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      const coordinatorApi = Comlink.wrap<InternalWorkerApi>(workerRef.current);
      comlinkApiRef.current = coordinatorApi;
      setApi(coordinatorApi);
      console.log('[useAnimationCoordinator] Worker initialized and Comlink API ready.');

      workerRef.current.onerror = event => {
        console.error('[useAnimationCoordinator] Worker Error:', event);
        setError(new Error(`Worker error: ${event.message}`));
        setApi(null);
        comlinkApiRef.current = null;
        setIsInitializing(false);
        setIsAnimating(false);
      };
    } catch (err) {
      console.error('[useAnimationCoordinator] Failed to initialize worker:', err);
      setError(err instanceof Error ? err : new Error('Unknown worker initialization error'));
      setApi(null);
      comlinkApiRef.current = null;
    } finally {
      setIsInitializing(false);
    }

    return () => {
      console.log(`[useAnimationCoordinator] Killing pipeline for scope: ${animationScope}`);
      pipeline.kill();

      if (workerRef.current) {
        console.log('[useAnimationCoordinator] Terminating worker...');
        workerRef.current.terminate();
      }
    };
  }, [animationScope, pipeline]);

  const triggerAnimation = useCallback(
    async (config: AnimationSequenceConfig) => {
      if (!api) {
        console.error('[Hook] Worker API not ready to trigger sequence.');
        setError(new Error('Worker not initialized.'));
        return;
      }
      if (isAnimating) {
        console.warn('[Hook] Animation already in progress. Ignoring trigger.');
        return;
      }

      console.log(`[Hook] Triggering animation sequence: ${config.id}`);
      setIsAnimating(true);
      setProgress(0);
      setError(null);

      pipeline.clear();

      try {
        await api.startSequence(config, handleProgress, handleStepExecute, handleCompletion);
        pipeline.play();
      } catch (err) {
        console.error('[Hook] Error calling worker startSequence:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to start sequence via worker';
        setError(new Error(errorMessage));
        setIsAnimating(false);
      }
    },
    [api, isAnimating, pipeline, handleProgress, handleStepExecute, handleCompletion]
  );

  return { api, isInitializing, error, isAnimating, progress, triggerAnimation };
}
