# Creating Custom Animation Presets

This guide explains how to define and register a new GSAP animation preset in the MediaFlow application.

## 1. Overview

Animation presets are reusable GSAP configuration objects stored under `src/animations/presets/`. Each preset should export:

- `defaults`: The main tween variables (e.g., duration, ease, end-state properties).
- `vars`: Any override variables or target properties applied at runtime.
- `initialVars` (optional): Variables used to set the element's initial state via `gsap.set` before the tween.

Presets are combined into the `gsapConfigs` map in `src/animations/presets/index.ts` and consumed by `AnimationPipeline` via:

```ts
pipeline.addStep({
  target,
  preset: 'myPresetKey',
  vars: {
    /* overrides */
  },
});
```

## 2. Steps to Create a New Preset

1. **Choose/Create a folder**

   - Organize presets by feature under `src/animations/presets/` (e.g., `uiEffects`, `dragDrop`).
   - Navigate to your desired subdirectory.

2. **Define the preset file**

   - Create a new TypeScript file, for example:

     ```ts
     // src/animations/presets/uiEffects/fadeInZoom.ts
     import type { GsapConfig } from './types';

     export const fadeInZoom: GsapConfig = {
       defaults: {
         opacity: 1,
         scale: 1,
         duration: 0.5,
         ease: 'back.out(1.2)',
       },
       vars: {},
       initialVars: {
         opacity: 0,
         scale: 0.8,
       },
     };
     ```

3. **Export the preset**

   - Add your preset to the barrel file `src/animations/presets/index.ts`:
     ```ts
     export { fadeInZoom } from './uiEffects/fadeInZoom';
     ```

4. **Use the preset in your pipeline**

   ```ts
   import { useAnimationPipeline } from '../animations/AnimationManager';

   const pipeline = useAnimationPipeline('customScope');
   pipeline.clear().addStep({ target: elementRef.current, preset: 'fadeInZoom' }).play();
   ```

## 3. Best Practices

- **Naming:** Use camelCase keys that clearly describe the effect (e.g., `slideInLeft`).
- **Initial State:** Leverage `initialVars` to avoid flashes of unstyled elements.
- **Modularity:** Group related presets in the same folder.
- **Overrides:** Use the `vars` property to pass one-off overrides without modifying the preset.
- **Testing:** Preview presets in a sandbox component before integrating into production views.
