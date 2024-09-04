import React from "react";
import ImageFeed from "./ImageFeed";
import { ImageInfo } from "../types";
import { groupImagesByName } from "../utils/imageUtils";

// Define the props interface for the ImageViewer component
interface ImageViewerProps {
  images: ImageInfo[];
  isLoading: boolean;
  error: string | null;
  selectedFolder: string;
}

// Define the ImageViewer component
const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  isLoading,
  error,
  selectedFolder,
}) => {
  const groupedImages = groupImagesByName(images);

  return (
    // Main container with flex layout
    <div className="flex flex-col h-full bg-background-dark">
      {/* Content container with scrolling */}
      <div className="flex-1 overflow-auto p-4">
        {/* Conditional rendering based on error, loading, and image availability */}
        {error ? (
          // Display error message if there's an error
          <div className="text-center text-accent-red">
            <p>Error: {error}</p>
            <p>
              Please try again later or contact support if the problem persists.
            </p>
            'j'
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
            groupedImages={groupedImages}
          />
        )}
      </div>
    </div>
  );
};

// Export the ImageViewer component
export default ImageViewer;
