import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook to batch multiple state updates or other side effects
 * into a single requestAnimationFrame callback. This helps prevent
 * unnecessary re-renders when multiple asynchronous operations
 * resolve close together.
 *
 * @returns An object containing:
 *  - `scheduleFlush`: A function to schedule a callback to be run in the next animation frame batch.
 *  - `cancelPending`: A function to cancel any scheduled callbacks that haven't run yet.
 */
export function useBatchedUpdates() {
  const callbacksRef = useRef<Set<() => void>>(new Set());
  const frameIdRef = useRef<number | null>(null);

  // The function that runs all scheduled callbacks
  const flushCallbacks = useCallback(() => {
    // Clear the frame ID *before* running callbacks
    // so that if a callback schedules another flush, it works correctly.
    frameIdRef.current = null;

    // Make a copy and clear the original set *before* iterating
    // This prevents issues if a callback schedules more work.
    const callbacksToRun = new Set(callbacksRef.current);
    callbacksRef.current.clear();

    callbacksToRun.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error executing batched callback:', error);
      }
    });
  }, []);

  // Function to schedule a callback for the next frame
  const scheduleFlush = useCallback(
    (callback: () => void) => {
      if (typeof callback !== 'function') {
        console.warn('Attempted to schedule a non-function callback.');
        return;
      }
      callbacksRef.current.add(callback);

      // If a frame isn't already scheduled, request one
      if (frameIdRef.current === null) {
        frameIdRef.current = requestAnimationFrame(flushCallbacks);
      }
    },
    [flushCallbacks]
  );

  // Function to cancel any pending flush
  const cancelPending = useCallback(() => {
    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }
    // Also clear any callbacks that were scheduled but haven't run
    callbacksRef.current.clear();
  }, []);

  // Cleanup on unmount: Cancel any pending frame
  useEffect(() => {
    return () => {
      cancelPending();
    };
  }, [cancelPending]);

  return { scheduleFlush, cancelPending };
}
