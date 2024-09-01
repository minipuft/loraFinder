import React from 'react';
import ImageFeed from './ImageFeed';
import { ImageInfo } from '../types';

interface ImageViewerProps {
  images: ImageInfo[];
  isLoading: boolean;
  error: string | null;
  selectedFolder: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  isLoading,
  error,
  selectedFolder
}) => {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold p-4 text-white">Folder: {selectedFolder}</h2>
      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="text-center text-red-500">
            <p>Error: {error}</p>
            <p>Please try again later or contact support if the problem persists.</p>
          </div>
        ) : isLoading ? (
          <div className="text-center text-white">Loading images...</div>
        ) : images.length === 0 ? (
          <div className="text-center text-white">No images found in this folder.</div>
        ) : (
          <ImageFeed 
            images={images} 
            isLoading={isLoading} 
          />
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
