import { useEffect, useRef, useState, useCallback } from 'react';

interface ResizeObserverEntry {
  contentRect: DOMRectReadOnly;
  target: Element;
}

interface ElementSize {
  width: number;
  height: number;
}

const DEBOUNCE_TIMEOUT = 150;

function useResizeObserver<T extends HTMLElement>() {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const elementRef = useRef<T | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateSize = useCallback((entries: ResizeObserverEntry[]) => {
    const entry = entries[0];
    if (entry) {
      const { width, height } = entry.contentRect;

      // Use RAF for smooth updates
      requestAnimationFrame(() => {
        setSize(prevSize => {
          // Only update if dimensions actually changed
          if (prevSize.width !== width || prevSize.height !== height) {
            return { width, height };
          }
          return prevSize;
        });
      });
    }
  }, []);

  const debouncedUpdateSize = useCallback(
    (entries: ResizeObserverEntry[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => updateSize(entries), DEBOUNCE_TIMEOUT);
    },
    [updateSize]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      debouncedUpdateSize(entries);
    });

    observerRef.current.observe(element);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [debouncedUpdateSize]);

  return { ref: elementRef, size };
}

export default useResizeObserver;
