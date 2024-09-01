import React from 'react';
import { IconZoomIn, IconZoomOut } from '@tabler/icons-react';

/**
 * Props for the ZoomSlider component.
 * @interface ZoomSliderProps
 * @property {number} zoom - Current zoom level.
 * @property {function} onZoomChange - Callback function to update zoom level.
 */
interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

/**
 * ZoomSlider component for adjusting image zoom level.
 * 
 * @component
 * @param {ZoomSliderProps} props - The props for the ZoomSlider component.
 * @returns {JSX.Element} A slider with zoom in/out icons for adjusting image size.
 */
const ZoomSlider: React.FC<ZoomSliderProps> = ({ zoom, onZoomChange }) => {
  return (
    <div className="flex items-center bg-gray-700 rounded-md p-1">
      {/* Zoom out icon */}
      <IconZoomOut size={16} className="text-gray-400 mr-1" />
      
      {/* Range input for zoom control */}
      <input
        type="range"
        min="0.5"  // Minimum zoom level (50%)
        max="2"    // Maximum zoom level (200%)
        step="0.1" // Zoom increments
        value={zoom}
        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
        className="w-20 mx-1 appearance-none bg-gray-600 h-1 rounded-full outline-none"
      />
      
      {/* Zoom in icon */}
      <IconZoomIn size={16} className="text-gray-400 ml-1" />
    </div>
  );
};

export default ZoomSlider;