import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { AnimationPipeline } from '../animations/AnimationPipeline';

// Define the structure for a registered pipeline
interface RegisteredPipeline {
  id: string;
  pipeline: AnimationPipeline;
  triggerEvents: string[]; // Events that should trigger this pipeline
  playOnTrigger?: boolean; // If true, plays; if false (or undefined), restarts
}

// Define the shape of the context value
interface AnimationControllerContextValue {
  /**
   * Triggers a specific event, potentially starting registered pipelines.
   * @param eventName The name of the event to trigger (e.g., 'routeEnter', 'dataLoaded').
   */
  trigger: (eventName: string) => void;

  /**
   * Registers an AnimationPipeline instance to be triggered by specific events.
   * Returns a function to unregister the pipeline.
   *
   * @param id A unique identifier for the pipeline.
   * @param pipeline The AnimationPipeline instance.
   * @param triggerEvents An array of event names that should trigger this pipeline.
   * @param playOnTrigger If true, calls play(); otherwise calls restart(). Defaults to false (restart).
   * @returns A function to call for unregistering the pipeline.
   */
  registerPipeline: (
    id: string,
    pipeline: AnimationPipeline,
    triggerEvents: string[],
    playOnTrigger?: boolean
  ) => () => void; // Returns unregister function
}

// Create the context with a default value (or null)
const AnimationControllerContext = createContext<AnimationControllerContextValue | null>(null);

// Define props for the provider
interface AnimationControllerProviderProps {
  children: React.ReactNode;
}

// Implement the Provider component
export const AnimationControllerProvider: React.FC<AnimationControllerProviderProps> = ({
  children,
}) => {
  // Use useRef to store pipelines to avoid re-renders on registration/unregistration
  const pipelinesRef = useRef<Map<string, RegisteredPipeline>>(new Map());
  // Optional: State to track the last triggered event if needed elsewhere
  // const [lastEvent, setLastEvent] = useState<string | null>(null);

  // --- Trigger Function --- >
  const trigger = useCallback((eventName: string) => {
    console.log(`[AnimationController] Triggering event: "${eventName}"`);
    // setLastEvent(eventName); // Update last event state if needed

    pipelinesRef.current.forEach(registered => {
      if (registered.triggerEvents.includes(eventName)) {
        console.log(
          `[AnimationController] Running pipeline "${registered.id}" for event "${eventName}"`
        );
        if (registered.playOnTrigger) {
          registered.pipeline.play().catch(err => {
            console.error(`Error playing pipeline ${registered.id}:`, err);
          });
        } else {
          registered.pipeline.restart().catch(err => {
            console.error(`Error restarting pipeline ${registered.id}:`, err);
          });
        }
      }
    });
  }, []);

  // --- Register Function --- >
  const registerPipeline = useCallback(
    (
      id: string,
      pipeline: AnimationPipeline,
      triggerEvents: string[],
      playOnTrigger: boolean = false // Default to restart
    ): (() => void) => {
      if (pipelinesRef.current.has(id)) {
        console.warn(
          `[AnimationController] Pipeline with ID "${id}" already registered. Overwriting.`
        );
      }
      console.log(`[AnimationController] Registering pipeline "${id}" for events:`, triggerEvents);
      pipelinesRef.current.set(id, { id, pipeline, triggerEvents, playOnTrigger });

      // Return the unregister function
      return () => {
        console.log(`[AnimationController] Unregistering pipeline "${id}"`);
        pipelinesRef.current.delete(id);
        // Note: The pipeline itself should be killed by the component that created it
        // using the useAnimationPipeline hook's cleanup.
      };
    },
    []
  );

  // --- Context Value --- >
  const contextValue: AnimationControllerContextValue = useMemo(
    () => ({ trigger, registerPipeline }),
    [trigger, registerPipeline]
  );

  return (
    <AnimationControllerContext.Provider value={contextValue}>
      {children}
    </AnimationControllerContext.Provider>
  );
};

// --- Consumer Hook --- >
export const useAnimationController = (): AnimationControllerContextValue => {
  const context = useContext(AnimationControllerContext);
  if (!context) {
    throw new Error('useAnimationController must be used within an AnimationControllerProvider');
  }
  return context;
};
