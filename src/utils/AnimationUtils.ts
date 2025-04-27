import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollTriggerManager from './ScrollTriggerManager';

gsap.registerPlugin(ScrollTrigger, CustomEase);

// Simplified animation system without ripples and energy mechanics
export class AnimationSystem {
  private static instance: AnimationSystem;
  private scrollTriggerManager: ScrollTriggerManager;

  private constructor() {
    this.initializeCustomEases();
    this.scrollTriggerManager = ScrollTriggerManager.getInstance();
  }

  private initializeCustomEases() {
    CustomEase.create(
      'smoothOut',
      'M0,0 C0.126,0.382 0.282,0.674 0.44,0.822 0.632,1.002 0.818,1 1,1'
    );
    CustomEase.create('gentleIn', 'M0,0 C0.39,0 0.575,0.565 0.669,0.782 0.762,1 0.846,1 1,1');
  }

  static getInstance(): AnimationSystem {
    if (!AnimationSystem.instance) {
      AnimationSystem.instance = new AnimationSystem();
    }
    return AnimationSystem.instance;
  }

  getAnimationProperties(itemId: string): gsap.TweenVars {
    return {
      duration: 0.5,
      ease: 'power2.out',
      transformOrigin: 'center center',
      scale: 1,
      rotation: 0,
    };
  }

  createHoverAnimation(element: HTMLElement, itemId: string) {
    return gsap.to(element, {
      scale: 1.05,
      duration: 0.3,
      ease: 'power2.out',
      force3D: true,
    });
  }

  createMorphAnimation(element: HTMLElement, itemId: string) {
    return gsap.to(element, {
      duration: 0.5,
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      ease: 'power2.out',
      force3D: true,
    });
  }

  // New method that uses the ScrollTriggerManager for scroll-based animations
  createScrollAnimation(element: HTMLElement, itemId: string, animationProps: gsap.TweenVars) {
    return this.scrollTriggerManager.addAnimation(itemId, element, animationProps);
  }
}

export default AnimationSystem;
