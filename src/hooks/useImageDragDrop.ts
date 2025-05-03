import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageInfo } from '../types';
import { reorderImagesById } from '../utils/layoutCalculator';

// Local storage helpers (moved from ImageFeed)
const STORAGE_KEY_PREFIX = 'mediaflow_image_order_';

const loadSavedImageOrder = (currentPath: string): string[] | null => {
  if (!currentPath) return null;
  try {
    const savedOrder = localStorage.getItem(`${STORAGE_KEY_PREFIX}${currentPath}`);
    if (savedOrder) {
      return JSON.parse(savedOrder) as string[];
    }
  } catch (error) {
    console.error('[useImageDragDrop] Error loading saved image order:', error);
  }
  return null;
};

const saveImageOrder = (path: string, order: string[]) => {
  if (!path) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${path}`, JSON.stringify(order));
  } catch (error) {
    console.error('[useImageDragDrop] Error saving image order:', error);
  }
};

interface UseImageDragDropProps {
  initialImages: ImageInfo[];
  folderPath: string;
  // Callback to notify parent component about layout recalculation needs
  onOrderChange?: () => void;
}

// Refactored hook focusing on order management
export function useImageOrderManager({
  initialImages,
  folderPath,
  onOrderChange,
}: UseImageDragDropProps) {
  const [customImageOrder, setCustomImageOrderInternal] = useState<string[] | null>(null);

  // --- Order Persistence ---

  // Load saved order when path changes or on initial load
  useEffect(() => {
    const savedOrder = loadSavedImageOrder(folderPath);
    setCustomImageOrderInternal(savedOrder);
  }, [folderPath]);

  // Save order whenever it changes (debounced)
  useEffect(() => {
    if (customImageOrder && folderPath) {
      const timeoutId = setTimeout(() => {
        saveImageOrder(folderPath, customImageOrder);
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    }
  }, [customImageOrder, folderPath]);

  // Recalculate ordered images when initial images or custom order changes
  const orderedImages = useMemo(
    () => reorderImagesById(initialImages, customImageOrder),
    [initialImages, customImageOrder]
  );

  // Wrapper for setting custom order that also calls the callback
  const setCustomImageOrder = useCallback(
    (newOrder: string[] | null) => {
      setCustomImageOrderInternal(newOrder);
      onOrderChange?.(); // Notify parent immediately when order is set programmatically (e.g., by DragContext)
    },
    [onOrderChange]
  );

  // Function to reset image order
  const resetImageOrder = useCallback(() => {
    if (folderPath) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${folderPath}`);
    }
    setCustomImageOrder(null); // Use the wrapped setter
  }, [folderPath, setCustomImageOrder]); // Added setCustomImageOrder dependency

  // Expose only the necessary state and functions for order management
  return {
    orderedImages,
    customImageOrder,
    setCustomImageOrder, // Expose the wrapped setter
    resetImageOrder,
  };
}
