import { gsap } from 'gsap';

// Attempt to import the actual AnimationPipeline if it exists and is needed.
// If direct pipeline interaction isn't strictly necessary for this animator class
// (as it manages its own timeline), this import can be removed or made more generic.
import type { AnimationPipeline } from '../AnimationPipeline'; // Adjust path as necessary

/**
 * Manages grouping and ungrouping animations for a collection of HTML elements.
 * Uses GSAP for timeline-based animations.
 */
export class GroupingAnimator {
  private timeline: gsap.core.Timeline;
  // Keep pipelineInstance optional. If methods from it are needed, ensure type compatibility.
  private pipelineInstance?: AnimationPipeline;

  constructor(pipelineInstance?: AnimationPipeline) {
    this.timeline = gsap.timeline();
    this.pipelineInstance = pipelineInstance; // Store if passed
  }

  /**
   * Clears any ongoing animations from the timeline and kills it.
   */
  public clear(): void {
    if (this.timeline) {
      this.timeline.clear().kill();
    }
    this.timeline = gsap.timeline();
  }

  /**
   * Animates elements to a grouped state towards a central point.
   * This is a placeholder and should be implemented according to desired grouping visuals.
   * @param elements - The HTML elements to animate.
   * @param viewportCenter - The viewport-relative coordinates of the grouping target.
   */
  public group(elements: HTMLElement[], viewportCenter: { x: number; y: number }): void {
    this.clear();
    if (!elements || elements.length === 0) {
      console.warn('[GroupingAnimator] group called with no elements.');
      return;
    }
    console.log('[GroupingAnimator] Placeholder group animation triggered.');
    this.timeline.to(elements, {
      x: (index, target) => {
        if (!target) return 0;
        const targetRect = target.getBoundingClientRect();
        return viewportCenter.x - targetRect.left - targetRect.width / 2;
      },
      y: (index, target) => {
        if (!target) return 0;
        const targetRect = target.getBoundingClientRect();
        return viewportCenter.y - targetRect.top - targetRect.height / 2;
      },
      opacity: 0.2,
      scale: 0.4,
      duration: 0.5,
      stagger: 0.025,
      ease: 'power2.inOut',
    });
    // Example of how pipeline MIGHT be used if its interface was compatible and it was needed:
    // if (this.pipelineInstance && typeof (this.pipelineInstance as any).add === 'function') {
    //   (this.pipelineInstance as any).add(this.timeline, `grouping-animation-${Date.now()}`);
    // }
  }

  /**
   * Animates elements from a common viewport origin to their individual final layout positions.
   * @param elements - The HTML elements to animate (e.g., image cards).
   * @param viewportOrigin - The viewport-relative coordinates (e.g., {x, y}) from which elements should appear to emanate.
   */
  public ungroup(elements: HTMLElement[], viewportOrigin: { x: number; y: number }): void {
    this.clear();
    if (!elements || elements.length === 0) {
      console.warn('[GroupingAnimator] ungroup called with no elements.');
      return;
    }
    this.timeline.fromTo(
      elements,
      {
        x: (index, target) => {
          if (!target) return 0;
          const targetRect = target.getBoundingClientRect();
          return viewportOrigin.x - targetRect.left;
        },
        y: (index, target) => {
          if (!target) return 0;
          const targetRect = target.getBoundingClientRect();
          return viewportOrigin.y - targetRect.top;
        },
        scale: 0.3,
        opacity: 0,
      },
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
        stagger: {
          amount: Math.min(0.8, elements.length * 0.02),
          from: 'center',
          grid: 'auto',
        },
      }
    );
    // Example of how pipeline MIGHT be used:
    // if (this.pipelineInstance && typeof (this.pipelineInstance as any).add === 'function') {
    //  (this.pipelineInstance as any).add(this.timeline, `ungrouping-animation-${Date.now()}`);
    // }
  }
}
