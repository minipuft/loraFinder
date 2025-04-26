import React, { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';

// Type for the data sent when an image is processed
export interface ProcessedImageUpdate {
  id: string;
  quality: 'low' | 'high';
  imageUrl: string;
  // Include dimensions if available and needed by ImageItem
  width?: number;
  height?: number;
}

// Type for the callback function used by subscribers
type ImageUpdateCallback = (data: ProcessedImageUpdate) => void;

// Type for the context value
interface ImageProcessingContextType {
  subscribeToImageUpdates: (imageId: string, callback: ImageUpdateCallback) => () => void; // Returns unsubscribe function
  publishImageUpdate: (data: ProcessedImageUpdate) => void;
}

// Create the context with a default value (can be null or a dummy implementation)
const ImageProcessingContext = createContext<ImageProcessingContextType | null>(null);

// Provider component props
interface ImageProcessingProviderProps {
  children: ReactNode;
}

// Keep track of subscriptions outside the component state if preferred
// This avoids re-rendering the provider on every subscription change
const subscriptions = new Map<string, Set<ImageUpdateCallback>>();

// Provider component implementation
export const ImageProcessingProvider: React.FC<ImageProcessingProviderProps> = ({ children }) => {
  const subscribeToImageUpdates = useCallback(
    (imageId: string, callback: ImageUpdateCallback): (() => void) => {
      if (!subscriptions.has(imageId)) {
        subscriptions.set(imageId, new Set());
      }
      const imageSubscriptions = subscriptions.get(imageId)!;
      imageSubscriptions.add(callback);

      // Return unsubscribe function
      return () => {
        if (subscriptions.has(imageId)) {
          subscriptions.get(imageId)!.delete(callback);
          // Optional: Clean up Set/Map entry if no subscribers left
          if (subscriptions.get(imageId)!.size === 0) {
            subscriptions.delete(imageId);
          }
        }
      };
    },
    []
  );

  const publishImageUpdate = useCallback((data: ProcessedImageUpdate) => {
    if (subscriptions.has(data.id)) {
      const imageSubscriptions = subscriptions.get(data.id)!;
      // Notify all subscribers for this image ID
      imageSubscriptions.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in image update callback for ID ${data.id}:`, error);
        }
      });
    }
  }, []);

  // Memoize the context value
  const contextValue = useMemo(
    () => ({
      subscribeToImageUpdates,
      publishImageUpdate,
    }),
    [subscribeToImageUpdates, publishImageUpdate]
  );

  return (
    <ImageProcessingContext.Provider value={contextValue}>
      {children}
    </ImageProcessingContext.Provider>
  );
};

// Custom hook for easy context consumption
export const useImageProcessing = (): ImageProcessingContextType => {
  const context = useContext(ImageProcessingContext);
  if (!context) {
    throw new Error('useImageProcessing must be used within an ImageProcessingProvider');
  }
  return context;
};
