import React from 'react';
import styles from '../styles/ImageViewer.module.scss';
import { ViewMode } from '../types.js';
import ImageFeed from './ImageFeed.js';

// Define the props interface for the ImageViewer component
interface ImageViewerProps {
  selectedFolder: string;
  isGrouped: boolean;
  zoom: number;
  viewMode: ViewMode;
}

// Define the ImageViewer component
const ImageViewer: React.FC<ImageViewerProps> = ({ selectedFolder, isGrouped, zoom, viewMode }) => {
  return (
    // Main container with flex layout
    <div className={`${styles.imageViewer} flex flex-col h-full`}>
      {/* Content container with scrolling */}
      <div className={`${styles.contentContainer} flex-1`}>
        {/* Render ImageFeed directly, passing the folderPath */}
        {/* ImageFeed now handles its own loading, error, and empty states */}
        <ImageFeed
          folderPath={selectedFolder}
          isGrouped={isGrouped}
          zoom={zoom}
          viewMode={viewMode}
        />
      </div>
    </div>
  );
};

// Export the ImageViewer component
export default ImageViewer;
