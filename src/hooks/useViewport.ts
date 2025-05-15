import { useEffect, useState } from 'react';
import useWindowSize from './useWindowSize';

// Hook to provide viewport dimensions and scroll position
type ViewportRect = { top: number; left: number; width: number; height: number };
interface Viewport {
  rect: ViewportRect;
  scrollY: number;
}

export default function useViewport(): Viewport {
  const { width, height } = useWindowSize();
  const [scrollY, setScrollY] = useState<number>(window.scrollY);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    // Add { passive: true } for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial call to set scrollY, in case the page is already scrolled on load.
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return {
    rect: {
      top: 0,
      left: 0,
      width: width ?? window.innerWidth,
      height: height ?? window.innerHeight,
    },
    scrollY,
  };
}
