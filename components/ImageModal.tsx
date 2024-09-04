import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ImageInfo } from "../types";

// Define the props interface for ImageModal component
interface ImageModalProps {
  image: ImageInfo;
  onClose: () => void;
}

// Define the ImageModal component
const ImageModal: React.FC<ImageModalProps> = ({ image, onClose }) => {
  // State to track if the image has loaded
  const [imageLoaded, setImageLoaded] = useState(false);

  // Callback function to handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Effect to add and remove event listener for key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose]);

  // Render the modal
  return (
    // Modal overlay
    <div className="fixed inset-0 bg-background-dark bg-opacity-75 flex items-center justify-center z-50">
      {/* Modal content container */}
      <div className="bg-background-light p-4 rounded-lg shadow-lg max-w-3xl w-full">
        {/* Image container */}
        <div className="relative aspect-w-16 aspect-h-9 mb-4">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
          <Image
            src={image.url}
            alt={image.name}
            layout="fill"
            objectFit="contain"
            onLoad={handleImageLoad}
            className={`rounded-lg transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
        {/* Image title */}
        <h2 className="text-xl font-bold mb-2 text-gray-100">{image.name}</h2>
        {/* Image description */}
        <p className="text-gray-300 mb-4">{image.description}</p>
        {/* Close button */}
        <button
          onClick={onClose}
          className="bg-primary text-gray-100 px-4 py-2 rounded hover:bg-opacity-90 transition-colors duration-300 ease-in-out"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Export the ImageModal component
export default ImageModal;
