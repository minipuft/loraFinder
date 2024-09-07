import React from "react";
import ImageFeed from "./ImageFeed.js";
import { ImageInfo } from "../types.js";
import styles from "../styles/ImageViewer.module.scss";

// Define the props interface for the ImageViewer component
interface ImageViewerProps {
  images: ImageInfo[];
  isLoading: boolean;
  error: string | null;
  selectedFolder: string;
  isGrouped: boolean;
  zoom: number;
}

// Define the ImageViewer component
const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  isLoading,
  error,
  selectedFolder,
  isGrouped,
  zoom,
}) => {

  return (
    // Main container with flex layout
    <div className={`${styles.imageViewer} flex flex-col h-full`}>
      {/* Content container with scrolling */}
      <div className={`${styles.contentContainer} flex-1`}>
        {/* Conditional rendering based on error, loading, and image availability */}
        {error ? (
          // Display error message if there's an error
          <div className="text-center text-accent-red">
            <p>Error: {error}</p>
            <p>
              Please try again later or contact support if the problem persists.
            </p>
          </div>
        ) : isLoading ? (
          // Display loading message while images are being fetched
          <div className="text-center text-gray-300">Loading images...</div>
        ) : images.length === 0 ? (
          // Display message when no images are found in the folder
          <div className="text-center text-gray-300">
            No images found in this folder.
          </div>
        ) : (
          // Render ImageFeed component when images are available
          <ImageFeed
            images={images}
            isLoading={isLoading}
            isGrouped={isGrouped}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
};

// Export the ImageViewer component
export default ImageViewer;
