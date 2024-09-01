import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ImageInfo } from '../types';

interface ImageModalProps {
  image: ImageInfo;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ image, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
      <div className={`bg-white rounded-lg p-8 max-w-4xl max-h-full overflow-auto transition-all duration-300 ease-in-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="relative aspect-w-1 aspect-h-1 mb-4">
          <Image
            src={image.src}
            alt={image.alt}
            layout="responsive"
            objectFit="contain"
            onLoad={() => setIsLoaded(true)}
          />
        </div>
        <h2 className="text-2xl font-bold mb-2">{image.title}</h2>
        <p className="text-gray-600 mb-4">{image.alt}</p>
        <button
          onClick={onClose}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-red-600 transition-colors duration-300 ease-in-out"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ImageModal;