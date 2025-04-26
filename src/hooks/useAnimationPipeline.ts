import { useEffect, useMemo, useRef } from 'react';
import { AnimationPipeline } from '../animations/AnimationPipeline';

/**
 * Custom hook to create and manage an AnimationPipeline instance.
 *
 * @param options Optional GSAP TimelineVars for the pipeline.
 * @returns An instance of AnimationPipeline.
 */
export function useAnimationPipeline(options?: gsap.TimelineVars): AnimationPipeline {
  // Use useRef to hold the pipeline instance so it persists across renders
  // without causing re-renders itself when its internal state changes.
  const pipelineRef = useRef<AnimationPipeline | null>(null);

  // Memoize the options object to prevent unnecessary pipeline recreation
  // Note: A deep comparison might be needed if options are complex and change often.
  // For typical timeline options (like paused, onComplete), this shallow comparison is usually sufficient.
  const memoizedOptions = useMemo(() => options, [JSON.stringify(options)]); // Simple serialization for comparison

  // Initialize the pipeline only once or if options change
  if (pipelineRef.current === null) {
    pipelineRef.current = new AnimationPipeline(memoizedOptions);
  }

  // Cleanup function to kill the timeline when the component unmounts
  useEffect(() => {
    const pipeline = pipelineRef.current;
    // Return the cleanup function
    return () => {
      if (pipeline) {
        // console.log('[useAnimationPipeline] Cleaning up pipeline');
        pipeline.kill();
        pipelineRef.current = null; // Clear the ref
      }
    };
  }, [memoizedOptions]); // Re-run effect only if memoized options change (unlikely for constructor options)

  // Ensure we always return a valid instance (or handle error)
  if (!pipelineRef.current) {
    // This case should ideally not happen if initialization logic is correct
    // but provides a fallback.
    pipelineRef.current = new AnimationPipeline(memoizedOptions);
    console.error('[useAnimationPipeline] Pipeline was null after initialization. Recreated.');
  }

  return pipelineRef.current;
}
