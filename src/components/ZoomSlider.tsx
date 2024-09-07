import React from "react";
import { motion } from "framer-motion";
import { useSpring, animated } from "react-spring";

// Define the props interface for the ZoomSlider component
interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

// ZoomSlider component for adjusting image zoom level
const ZoomSlider: React.FC<ZoomSliderProps> = ({ zoom, onZoomChange }) => {
  const sliderSpring = useSpring({
    width: `${(zoom - 0.5) / 1.5 * 100}%`,
    config: { tension: 300, friction: 10 }
  });

  return (
    // Container for the zoom slider
    <div className="flex items-center bg-gray-600 rounded-full p-2 overflow-hidden">
      {/* Zoom out icon */}
      <motion.svg
        whileHover={{ scale: 1.2 }}
        className="text-gray-200 mr-2"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M21 21L16.65 16.65M11 8V14M8 11H14M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </motion.svg>
      {/* Range input for zoom control */}
      <div className="relative w-24 h-2 bg-gray-500 rounded-full overflow-hidden">
        <animated.div className="absolute top-0 left-0 h-full bg-blue-400 rounded-full" style={sliderSpring} />
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      {/* Zoom in icon */}
      <motion.svg
        whileHover={{ scale: 1.2 }}
        className="text-gray-200 ml-2"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </motion.svg>
    </div>
  );
};

// Export the ZoomSlider component
export default ZoomSlider;
