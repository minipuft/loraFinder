import React from "react";

// Define the ImageSkeleton component as a functional component
const ImageSkeleton: React.FC = () => {
  return (
    // Wrapper div with animation for loading effect
    <div className="animate-pulse">
      {/* Placeholder for the image */}
      <div className="bg-gray-600 rounded-lg aspect-w-1 aspect-h-1"></div>
      {/* Placeholder for the image title or description */}
      <div className="mt-2 h-4 bg-gray-600 rounded w-3/4"></div>
    </div>
  );
};

// Export the ImageSkeleton component as the default export
export default ImageSkeleton;
