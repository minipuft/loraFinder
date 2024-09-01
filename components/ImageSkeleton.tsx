import React from 'react';

const ImageSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-300 rounded-lg aspect-w-1 aspect-h-1"></div>
      <div className="mt-2 h-4 bg-gray-300 rounded w-3/4"></div>
    </div>
  );
};

export default ImageSkeleton;