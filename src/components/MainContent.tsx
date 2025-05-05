import React from 'react';
import { useAppSettings } from '../contexts'; // Import context hook
import ImageViewer from './ImageViewer.js';

// Define the props interface for the MainContent component
interface MainContentProps {
  // images: ImageInfo[]; // Removed
  scrollContainerRef: React.RefObject<HTMLElement>;
  // animationPipeline: AnimationPipeline;
}

// MainContent component that renders the primary content area of the application
const MainContent: React.FC<MainContentProps> = ({
  // images, // Removed
  scrollContainerRef,
  // animationPipeline,
}) => {
  // Consume context to get values - these will be used by ImageViewer via context later
  const { selectedFolder, zoom, isGrouped, viewMode, searchQuery } = useAppSettings();

  // TODO: Filter images based on searchQuery if applicable here or in ImageFeed/ImageViewer
  // const filteredImages = useMemo(() => {
  //   if (!searchQuery) return images;
  //   return images.filter(img => img.title.toLowerCase().includes(searchQuery.toLowerCase()));
  // }, [images, searchQuery]);

  // Render the main content
  return (
    <div className="main-content h-full w-full bg-transparent">
      {/* ImageViewer will consume context directly in the next step */}
      {/* We pass the scroll ref, but other props will be removed from ImageViewer */}
      <ImageViewer
        // images={filteredImages} // Removed
        // isLoading={isLoading} // Removed
        // error={error} // Removed
        // Props removed - ImageViewer uses context now
        scrollContainerRef={scrollContainerRef}
        // animationPipeline={animationPipeline}
      />
    </div>
  );
};

// Export the MainContent component
export default MainContent;
