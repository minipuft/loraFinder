import { useState, useEffect, useCallback } from 'react';

// Define the structure for the window size object
interface WindowSize {
  width: number | undefined;
  height: number | undefined;
}

// Debounce timeout in milliseconds
const DEBOUNCE_TIMEOUT = 150;

// Custom hook to track and return the current window size
function useWindowSize() {
  // State to store the current window size
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Memoized resize handler
  const handleResize = useCallback(() => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    // Only update if dimensions actually changed
    if (newWidth !== windowSize.width || newHeight !== windowSize.height) {
      // Use RAF for smooth updates
      requestAnimationFrame(() => {
        setWindowSize({
          width: newWidth,
          height: newHeight,
        });
      });
    }
  }, [windowSize.width, windowSize.height]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    // Debounced resize handler
    function debouncedResize() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(handleResize, DEBOUNCE_TIMEOUT);
    }

    // Initial size calculation
    handleResize();

    // Add event listener with debouncing
    window.addEventListener('resize', debouncedResize);

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', debouncedResize);
    };
  }, [handleResize]);

  return windowSize;
}

export default useWindowSize;
