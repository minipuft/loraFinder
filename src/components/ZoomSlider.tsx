import { motion, useAnimation } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { animated, useSpring } from 'react-spring';

// Define the props interface for the ZoomSlider component
interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

// ZoomSlider component for adjusting image zoom level
const ZoomSlider: React.FC<ZoomSliderProps> = ({ zoom, onZoomChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();

  const sliderSpring = useSpring({
    width: `${((zoom - 0.5) / 1.5) * 100}%`,
    config: {
      tension: 300,
      friction: 10,
      precision: 0.01,
    },
  });

  const glowSpring = useSpring({
    opacity: isDragging ? 1 : 0.6,
    scale: isDragging ? 1.1 : 1,
    config: {
      tension: 300,
      friction: 20,
    },
  });

  useEffect(() => {
    controls.start({
      scale: isDragging ? 1.05 : 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    });
  }, [isDragging, controls]);

  return (
    <motion.div
      className="relative flex items-center bg-gray-800/80 backdrop-blur-md rounded-full p-3 overflow-hidden"
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '200px',
      }}
      animate={controls}
    >
      {/* Zoom out icon */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
      >
        <motion.svg
          className="text-gray-200 mr-3 cursor-pointer"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          whileHover={{ rotate: -90 }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M21 21L16.65 16.65M11 8V14M8 11H14M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
        <animated.div
          style={{
            ...glowSpring,
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '30px',
            height: '30px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </motion.div>

      {/* Slider track */}
      <div className="relative flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <animated.div
          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
          style={{
            ...sliderSpring,
            boxShadow: '0 0 10px rgba(59,130,246,0.5)',
          }}
        />
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={zoom}
          onChange={e => onZoomChange(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Zoom in icon */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
      >
        <motion.svg
          className="text-gray-200 ml-3 cursor-pointer"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          whileHover={{ rotate: 90 }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
        <animated.div
          style={{
            ...glowSpring,
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '30px',
            height: '30px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </motion.div>
    </motion.div>
  );
};

// Export the ZoomSlider component
export default ZoomSlider;
