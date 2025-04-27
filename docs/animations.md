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
