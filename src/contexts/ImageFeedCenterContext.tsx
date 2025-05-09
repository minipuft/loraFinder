import React, { createContext, useContext, useMemo, useState } from 'react';

export interface ImageFeedCenter {
  x: number;
  y: number;
}

interface ImageFeedCenterContextType {
  imageFeedCenter: ImageFeedCenter | null;
  setImageFeedCenter: (center: ImageFeedCenter | null) => void;
}

const ImageFeedCenterContext = createContext<ImageFeedCenterContextType | undefined>(undefined);

export const ImageFeedCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [imageFeedCenter, setImageFeedCenter] = useState<ImageFeedCenter | null>(null);

  const value = useMemo(
    () => ({
      imageFeedCenter,
      setImageFeedCenter,
    }),
    [imageFeedCenter]
  );

  return (
    <ImageFeedCenterContext.Provider value={value}>{children}</ImageFeedCenterContext.Provider>
  );
};

export const useImageFeedCenter = (): ImageFeedCenterContextType => {
  const context = useContext(ImageFeedCenterContext);
  if (context === undefined) {
    throw new Error('useImageFeedCenter must be used within an ImageFeedCenterProvider');
  }
  return context;
};
