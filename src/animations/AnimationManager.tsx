import React, { createContext, useContext, useMemo } from 'react';
import { AnimationPipeline } from './AnimationPipeline'; // Assuming sibling file

interface AnimationManagerValue {
  getPipeline: (scope?: string) => AnimationPipeline;
  // Potential future additions: registerTarget, dispatchEvent etc.
}

// Create context with a default value (null or throwing error function)
const AnimationManagerContext = createContext<AnimationManagerValue | null>(null);

export const AnimationManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use useMemo to ensure the map instance persists across renders
  const pipelines = useMemo(() => new Map<string, AnimationPipeline>(), []);

  // Memoize the getPipeline function to ensure consumers get a stable reference
  const getPipeline = useMemo(
    () =>
      (scope: string = 'global'): AnimationPipeline => {
        if (!pipelines.has(scope)) {
          console.log(`[AnimationManager] Creating pipeline for scope: ${scope}`);
          pipelines.set(scope, new AnimationPipeline());
        }
        return pipelines.get(scope)!;
      },
    [pipelines]
  ); // Dependency array includes the map instance

  // Clean up pipelines on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      console.log('[AnimationManager] Cleaning up pipelines...');
      pipelines.forEach((pipeline, scope) => {
        console.log(`[AnimationManager] Killing pipeline for scope: ${scope}`);
        pipeline.kill();
      });
      pipelines.clear();
    };
  }, [pipelines]); // Run cleanup when the provider unmounts

  // Memoize the context value itself
  const contextValue = useMemo(
    () => ({
      getPipeline,
    }),
    [getPipeline]
  );

  return (
    <AnimationManagerContext.Provider value={contextValue}>
      {children}
    </AnimationManagerContext.Provider>
  );
};

// Custom hook for consuming the context
export const useAnimationPipeline = (scope?: string): AnimationPipeline => {
  const ctx = useContext(AnimationManagerContext);
  if (!ctx) {
    throw new Error('useAnimationPipeline must be used within an AnimationManagerProvider');
  }
  // The hook itself doesn't need to be memoized, context provides stability.
  // Get the pipeline for the requested scope (defaults to 'global' in getPipeline)
  return ctx.getPipeline(scope);
};
