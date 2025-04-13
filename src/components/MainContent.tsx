import React from 'react';
import { ViewMode } from '../types.js';
import ImageViewer from './ImageViewer.js';

// Define the props interface for the MainContent component
interface MainContentProps {
  // images: ImageInfo[]; // Removed
  selectedFolder: string;
  searchQuery: string; // Kept for now, but its usage needs re-evaluation
  // isLoading: boolean; // Removed
  // error: string | null; // Removed
  zoom: number;
  isGrouped: boolean;
  viewMode: ViewMode;
}

// MainContent component that renders the primary content area of the application
const MainContent: React.FC<MainContentProps> = ({
  // images, // Removed
  selectedFolder,
  searchQuery, // Kept for now
  // isLoading, // Removed
  // error, // Removed
  zoom,
  isGrouped,
  viewMode,
}) => {
  // Removed the filtering logic for now. Search needs to be handled differently.
  // const filteredImages = useMemo(() => {
  //   if (!searchQuery) return images;
  //   return images.filter(image => image.alt.toLowerCase().includes(searchQuery.toLowerCase()));
  // }, [images, searchQuery]);

  // Render the main content
  return (
    <>
      {/* Render the ImageViewer component */}
      <ImageViewer
        // images={filteredImages} // Removed
        // isLoading={isLoading} // Removed
        // error={error} // Removed
        selectedFolder={selectedFolder}
        zoom={zoom}
        isGrouped={isGrouped}
        viewMode={viewMode}
      />
    </>
  );
};

// Export the MainContent component
export default MainContent;
