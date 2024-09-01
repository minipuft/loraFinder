import React, { useMemo } from 'react';
import ImageViewer from './ImageViewer';
import UploadFiles from './UploadFiles';
import { ImageInfo } from '../types';

/**
 * Props for the MainContent component.
 * @interface MainContentProps
 */
interface MainContentProps {
  images: ImageInfo[];
  selectedFolder: string;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  onUploadComplete: () => void;
  zoom: number;
}

/**
 * MainContent component that renders the primary content area of the application.
 * It includes the image feed, upload functionality, and current directory display.
 *
 * @component
 * @param {MainContentProps} props - The props for the MainContent component.
 * @returns {JSX.Element} The main content area of the application.
 */
const MainContent: React.FC<MainContentProps> = ({
  images,
  selectedFolder,
  searchQuery,
  isLoading,
  error,
  onUploadComplete,
}) => {
  /**
   * Memoized filtered images based on the search query.
   * @type {ImageInfo[]}
   */
  const filteredImages = useMemo(() => {
    if (!searchQuery) return images;
    return images.filter(image => 
      image.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [images, searchQuery]);

  return (
    <>
      <ImageViewer
        images={filteredImages}
        isLoading={isLoading}
        error={error}
        selectedFolder={selectedFolder}
      />
      <UploadFiles selectedFolder={selectedFolder} onUploadComplete={onUploadComplete} />
    </>
  );
};

export default MainContent;