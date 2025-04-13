import { useEffect, useRef } from 'react';
import ScrollTriggerManager from '../utils/ScrollTriggerManager';

interface AnimationConfig {
  element: HTMLElement;
  animationProps: gsap.TweenVars;
  id: string;
}

export function useScrollAnimations(animations: AnimationConfig[] = []) {
  const animationIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const manager = ScrollTriggerManager.getInstance();

    // Register all animations
    animations.forEach(anim => {
      manager.addAnimation(anim.id, anim.element, anim.animationProps);
      animationIdsRef.current.push(anim.id);
    });

    // Cleanup
    return () => {
      animationIdsRef.current.forEach(id => {
        manager.removeAnimation(id);
      });
      animationIdsRef.current = [];
    };
  }, [animations]);
}
