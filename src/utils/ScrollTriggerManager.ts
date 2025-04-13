import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimationTarget {
  element: HTMLElement;
  animation: gsap.core.Tween | gsap.core.Timeline;
}

class ScrollTriggerManager {
  private static instance: ScrollTriggerManager;
  private targets: Map<string, AnimationTarget> = new Map();
  private timeline: gsap.core.Timeline;
  private mainTrigger: ScrollTrigger;

  private constructor() {
    this.timeline = gsap.timeline({
      paused: true,
      smoothChildTiming: true,
    });

    // Create one main ScrollTrigger
    this.mainTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => {
        // Update timeline progress based on scroll
        this.timeline.progress(self.progress);
      },
      markers: false, // Always disable markers
    });
  }

  static getInstance(): ScrollTriggerManager {
    if (!ScrollTriggerManager.instance) {
      ScrollTriggerManager.instance = new ScrollTriggerManager();
    }
    return ScrollTriggerManager.instance;
  }

  addAnimation(id: string, element: HTMLElement, animationProps: gsap.TweenVars) {
    // Create the animation but don't play it yet
    const animation = gsap.to(element, {
      ...animationProps,
      paused: true,
    });

    // Add it to our timeline
    this.timeline.add(animation, 0);

    // Store reference
    this.targets.set(id, { element, animation });

    return animation;
  }

  removeAnimation(id: string) {
    const target = this.targets.get(id);
    if (target) {
      this.timeline.remove(target.animation);
      this.targets.delete(id);
    }
  }

  cleanup() {
    // Kill all ScrollTriggers to prevent memory leaks
    this.targets.forEach(({ animation }) => {
      animation.kill();
    });

    if (this.mainTrigger) {
      this.mainTrigger.kill();
    }

    this.timeline.kill();
    this.targets.clear();
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
}

export default ScrollTriggerManager;
