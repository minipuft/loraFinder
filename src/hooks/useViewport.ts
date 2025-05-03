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
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
