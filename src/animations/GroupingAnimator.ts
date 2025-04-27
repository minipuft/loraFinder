import { gsap } from 'gsap';
import { AnimationPipeline } from './AnimationPipeline';

// Constants for animation parameters
const GROUP_DURATION = 0.4;
const GROUP_STAGGER = 0.02;
const GROUP_SCALE = 0.7;
const GROUP_ROTATION_RANGE = 10; // degrees

export class GroupingAnimator {
  private pipeline: AnimationPipeline | null = null;
  private isGrouping: boolean = false; // Track current animation state

  /**
   * Animates cards from their current position to a stacked deck at feedCenter.
   * @param cards - Array of HTMLElement cards to animate.
   * @param feedCenter - The {x, y} coordinates of the center of the feed area.
   */
  group(cards: HTMLElement[], feedCenter: { x: number; y: number }) {
    if (!cards.length || this.isGrouping) return; // Don't run if already grouping or no cards

    // Kill any existing animation before starting a new one
    this.kill();
    this.pipeline = new AnimationPipeline({
      // Ensure completion callback clears the state
      onComplete: () => {
        this.isGrouping = true; // Mark as grouped *after* animation finishes
      },
    });
    this.isGrouping = true; // Set immediately to prevent re-triggering during animation

    cards.forEach((card, i) => {
      // Ensure card has dimensions before calculating offsets
      if (card.offsetWidth === 0 || card.offsetHeight === 0) {
        console.warn(`Card ${card.id || i} has zero dimensions, skipping animation.`);
        return;
      }

      const rect = card.getBoundingClientRect();
      // Calculate offset relative to the viewport
      const offsetX = feedCenter.x - (rect.left + rect.width / 2);
      const offsetY = feedCenter.y - (rect.top + rect.height / 2);

      // Set initial state *before* adding to timeline if needed (e.g., zIndex)
      gsap.set(card, { zIndex: 10 + i }); // Bring cards forward during animation

      this.pipeline!.addStep({
        target: card,
        preset: 'none', // Indicate we are using custom vars, not a named preset
        vars: {
          x: offsetX,
          y: offsetY,
          scale: GROUP_SCALE,
          rotation: (Math.random() - 0.5) * GROUP_ROTATION_RANGE,
          duration: GROUP_DURATION,
          ease: 'power2.out',
          // Overwrite transform preserves other transforms (like Framer Motion's)
          // Set overwrite: 'auto' if conflicts arise, but start with false/none.
          overwrite: false,
        },
        position: `+=${GROUP_STAGGER}`, // Use relative stagger
      });
    });

    this.pipeline.play();
  }

  /**
   * Reverses the grouping animation, returning cards to their original positions.
   */
  ungroup() {
    if (!this.isGrouping || !this.pipeline) return; // Only ungroup if currently grouped

    // Reverse the timeline to smoothly return cards
    this.pipeline.reverse().then(() => {
      // Reset state *after* reverse animation completes
      this.isGrouping = false;
      // Optionally reset inline styles set by GSAP if Framer Motion doesn't override
      // gsap.set(cards, { clearProps: "transform,zIndex" }); // Example cleanup
    });
    // Prevent re-triggering ungroup during the reverse animation
    // Note: isGrouping remains true until reverse completes
  }

  /**
   * Immediately stops and cleans up the animation timeline.
   * Call this on component unmount or before starting a new conflicting animation.
   */
  kill() {
    if (this.pipeline) {
      this.pipeline.kill();
      this.pipeline = null;
    }
    this.isGrouping = false; // Reset state if animation is killed prematurely
  }

  /**
   * Gets the current grouping state.
   * @returns true if the animator considers the cards grouped, false otherwise.
   */
  getIsGroupedState(): boolean {
    return this.isGrouping;
  }
}
