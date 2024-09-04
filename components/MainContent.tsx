import React, { useMemo } from 'react';
import ImageViewer from './ImageViewer';
import UploadFiles from './UploadFiles';
import { ImageInfo } from '../types';

// Define the props interface for the MainContent component
interface MainContentProps {
  images: ImageInfo[];
  selectedFolder: string;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  onUploadComplete: () => void;
  zoom: number;
  isGrouped: boolean;
}

// MainContent component that renders the primary content area of the application
const MainContent: React.FC<MainContentProps> = ({
  images,
  selectedFolder,
  searchQuery,
  isLoading,
  error,
  onUploadComplete,
  zoom,
  isGrouped,
}) => {
  // Memoized filtered images based on the search query
  const filteredImages = useMemo(() => {
    if (!searchQuery) return images;
    return images.filter(image => 
      image.alt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [images, searchQuery]);

  // Render the main content
  return (
    <>
      {/* Render the ImageViewer component */}
      <ImageViewer
        images={filteredImages}
        isLoading={isLoading}
        error={error}
        selectedFolder={selectedFolder}
        zoom={zoom}
        isGrouped={isGrouped}
      />
      {/* Render the UploadFiles component */}
      <UploadFiles selectedFolder={selectedFolder} onUploadComplete={onUploadComplete} />
    </>
  );
};

// Export the MainContent component
export default MainContent;