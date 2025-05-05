import React, { RefObject, Suspense, useEffect, useRef, useState } from 'react';
import { useAppSettings } from '../contexts';
import styles from '../styles/ImageViewer.module.scss';
import ErrorBoundary from './ErrorBoundary';
import ImageFeedSkeleton from './lazy/ImageFeedSkeleton';
import { LazyImageFeed } from './lazy/lazyWidgets';

// Define the props interface for the ImageViewer component
interface ImageViewerProps {
  scrollContainerRef: RefObject<HTMLElement>;
}

// Define the ImageViewer component
const ImageViewer: React.FC<ImageViewerProps> = ({ scrollContainerRef }) => {
  // Consume context
  const { selectedFolder, isGrouped, zoom, viewMode } = useAppSettings();

  // Need container width for the skeleton fallback
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    // Main container with flex layout
    <div ref={containerRef} className={`${styles.imageViewer} flex flex-col h-full bg-transparent`}>
      {/* Content container */}
      <div className={`${styles.contentContainer} flex-1`}>
        {/* Error boundary remains */}
        <ErrorBoundary fallback={<div>Failed to load images.</div>}>
          {/* Suspense boundary keyed by folder path */}
          {/* Shows skeleton fallback immediately on folder change */}
          <Suspense
            key={selectedFolder} // Use selectedFolder from context
            fallback={
              <ImageFeedSkeleton
                folder={selectedFolder}
                zoom={zoom}
                viewMode={viewMode}
                isGrouped={isGrouped}
                containerWidth={containerWidth}
              />
            }
          >
            {/* Lazy load the actual ImageFeed */}
            <LazyImageFeed scrollContainerRef={scrollContainerRef} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

// Export the ImageViewer component
export default ImageViewer;
