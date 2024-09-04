import React from "react";
import { IconZoomIn, IconZoomOut } from "@tabler/icons-react";

// Define the props interface for the ZoomSlider component
interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

// ZoomSlider component for adjusting image zoom level
const ZoomSlider: React.FC<ZoomSliderProps> = ({ zoom, onZoomChange }) => {
  return (
    // Container for the zoom slider
    <div className="flex items-center bg-gray-600 rounded-md p-1">
      {/* Zoom out icon */}
      <IconZoomOut size={16} className="text-gray-200 mr-1" />
      {/* Range input for zoom control */}
      <input
        type="range"
        min="0.5"
        max="2"
        step="0.1"
        value={zoom}
        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
        className="w-20 mx-1 appearance-none bg-gray-500 h-1 rounded-full outline-none"
      />
      {/* Zoom in icon */}
      <IconZoomIn size={16} className="text-gray-200 ml-1" />
    </div>
  );
};

// Export the ZoomSlider component
export default ZoomSlider;
