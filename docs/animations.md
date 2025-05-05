# Animations in MediaFlow

This document outlines the animation strategies used within the MediaFlow application.

## Current State (Pre-Refactor)

- **Image Entrance:** Images use Framer Motion for entrance animations, currently defined inline within `ImageRow.tsx`. Variants are calculated based on feed center and target position.
- **Layout Shifts (General):** Framer Motion's `layout` prop is used on rows and image items in `ImageRow.tsx` to handle general layout adjustments.
- **Grouping Animation:** When the view toggles to grouped mode, a custom GSAP animation (`GroupingAnimator.ts`) calculates target positions relative to the feed center and animates cards using a GSAP timeline.
- **Exit Animation (Grouping Toggle):** A manual Promise-based system (`exitResolverRef` in `ImageFeed.tsx`) is used to delay the data/layout update until the GSAP exit animation completes.
- **Reduced Motion:** No specific handling for OS-level reduced motion preferences is implemented.

## Planned Refinements

- Integrate GSAP Flip plugin for grouping/ungrouping animations.
- Replace manual exit Promise with Framer Motion's `AnimatePresence onExitComplete`.
- Optimize Framer Motion layout performance (`layout="position"`, `LayoutGroup`, `layoutScroll`).
- Memoize animation variants using custom hooks.
- Add support for reduced motion preferences.

# Animation System (AnimationManager)

This document outlines the centralized animation system built around GSAP and managed via React Context.

## Overview

The goal of this system is to provide a unified way to manage and orchestrate GSAP animations throughout the application, preventing conflicting tweens and simplifying animation logic within components. It replaces the previous approach where individual components managed their own `AnimationPipeline` instances.

## Core Components

1.  **`AnimationManagerProvider` (`src/animations/AnimationManager.tsx`)**

    - A React Context provider that should wrap a high level of the application tree (e.g., inside `QueryClientProvider` in `src/main.tsx`).
    - It manages a map of `AnimationPipeline` instances, keyed by scope.
    - Crucially, it handles the lifecycle of these pipelines, automatically creating them on demand and killing them when the provider unmounts.

2.  **`useAnimationPipeline(scope?: string)` Hook (`src/animations/AnimationManager.tsx`)**

    - The primary way components access animation pipelines.
    - Takes an optional `scope` string argument (defaults to `'global'`).
    - Returns the `AnimationPipeline` instance associated with the requested scope. If a pipeline for that scope doesn't exist, the `AnimationManager` creates and returns a new one.
    - Components **should not** call `.kill()` on pipelines obtained via this hook; the `AnimationManagerProvider` handles cleanup.

3.  **`AnimationPipeline` Class (`src/animations/AnimationPipeline.ts`)**

    - The core GSAP timeline wrapper. Its API (e.g., `addStep`, `play`, `clear`, `reverse`, `onComplete`) remains the primary way to interact with timelines.
    - It is now instantiated _by_ the `AnimationManager`, not directly in components.

4.  **Presets (`src/animations/presets/`)**
    - Pre-defined animation configurations (GSAP vars, defaults) are stored here.
    - Used by passing the preset key name to `pipeline.addStep({ preset: 'presetName', ... })`.

## Usage

### Basic Component Animation

```typescript
import React, { useRef, useEffect } from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager';

const MyComponent: React.FC = () => {
  const elementRef = useRef<HTMLDivElement>(null);
  // Get the pipeline for a specific scope (e.g., related to this component type or view)
  const pipeline = useAnimationPipeline('myComponentScope');

  useEffect(() => {
    if (elementRef.current) {
      // Use the pipeline obtained from the hook
      pipeline
        .clear() // Clear previous animations on this scope's pipeline
        .addStep({
          target: elementRef.current,
          preset: 'fadeIn', // Use a defined preset
          vars: { duration: 0.5 } // Optional overrides
        })
        .play();
    }
  }, [pipeline]); // Include pipeline in dependency array

  return <div ref={elementRef}>Hello</div>;
};
```

### Global Animations

Triggering animations not tied to a specific component instance (e.g., on drag events).

```typescript
// Example within a context or higher-level component
import { useAnimationPipeline } from '../animations/AnimationManager';

function SomeContextProvider() {
  // Get the default 'global' pipeline
  const globalPipeline = useAnimationPipeline();

  const handleSomeEvent = () => {
    globalPipeline.addStep({ target: document.body, preset: 'globalPulse' }).play();
  };

  // ...
}
```

### Scopes

- `'global'`: Default scope for application-wide effects.
- `'feed'`: Used by `ImageFeed` and `ImageItem` for coordinating feed-related animations.
- Custom Scopes: Define logical scopes as needed (e.g., `'row-{id}'`, `'modal'`, `'banner'`) to group related animations and prevent unrelated timelines from interfering. The manager creates them as requested.

## Lifecycle Management

The `AnimationManagerProvider` automatically calls `.kill()` on all managed pipelines when it unmounts. Components using `useAnimationPipeline` do not need to manually clean up the pipeline instance itself. They should, however, still clean up any event listeners or timeouts they set up related to triggering animations.
