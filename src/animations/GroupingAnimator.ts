import { gsap } from 'gsap';
import { AnimationPipeline } from './AnimationPipeline';

// Constants for animation parameters
const GROUP_DURATION = 0.4;
const GROUP_STAGGER = 0.02;
const GROUP_SCALE = 0.7;
const GROUP_ROTATION_RANGE = 10; // degrees

export class GroupingAnimator {
  private pipeline: AnimationPipeline;
  private isGrouping: boolean = false;

  constructor(pipelineInstance: AnimationPipeline) {
    this.pipeline = pipelineInstance;
  }

  /**
   * Animates cards from their current position to a stacked deck at feedCenter.
   * @param cards - Array of HTMLElement cards to animate.
   * @param feedCenter - The {x, y} coordinates of the center of the feed area.
   */
  group(cards: HTMLElement[], feedCenter: { x: number; y: number }) {
    if (!cards.length || this.isGrouping) return;

    this.pipeline.clear();

    this.isGrouping = true;

    cards.forEach((card, i) => {
      if (card.offsetWidth === 0 || card.offsetHeight === 0) {
        console.warn(`Card ${card.id || i} has zero dimensions, skipping animation.`);
        return;
      }
      const rect = card.getBoundingClientRect();
      const offsetX = feedCenter.x - (rect.left + rect.width / 2);
      const offsetY = feedCenter.y - (rect.top + rect.height / 2);
      gsap.set(card, { zIndex: 10 + i });

      this.pipeline.addStep({
        target: card,
        preset: 'none',
        vars: {
          x: offsetX,
          y: offsetY,
          scale: GROUP_SCALE,
          rotation: (Math.random() - 0.5) * GROUP_ROTATION_RANGE,
          duration: GROUP_DURATION,
          ease: 'power2.out',
          overwrite: false,
        },
        position: `+=${GROUP_STAGGER}`,
      });
    });

    this.pipeline
      .play()
      .then(() => {
        if (this.isGrouping) {
          console.log('[GroupingAnimator] Group animation complete.');
        }
      })
      .catch(error => {
        console.error('[GroupingAnimator] Play error:', error);
        this.isGrouping = false;
      });
  }

  /**
   * Reverses the grouping animation, returning cards to their original positions.
   */
  ungroup() {
    if (!this.isGrouping || !this.pipeline) return;

    this.pipeline
      .reverse()
      .then(() => {
        console.log('[GroupingAnimator] Ungroup animation complete.');
        this.isGrouping = false;
      })
      .catch(error => {
        console.error('[GroupingAnimator] Reverse error:', error);
      });
  }

  /**
   * Clears the timeline managed by this animator.
   * Note: It no longer kills the pipeline, as that's managed externally.
   */
  clear() {
    if (this.pipeline) {
      this.pipeline.clear();
    }
    this.isGrouping = false;
  }

  /**
   * Gets the current grouping state.
   * @returns true if the animator considers the cards grouped, false otherwise.
   */
  getIsGroupedState(): boolean {
    return this.isGrouping;
  }
}
