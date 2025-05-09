import { motion, useAnimation } from 'framer-motion';
import React, { useEffect, useState } from 'react';

// Define the props interface for the ZoomSlider component
interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

// ZoomSlider component for adjusting image zoom level
const ZoomSlider: React.FC<ZoomSliderProps> = ({ zoom, onZoomChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();

  // compute animated values manually for Framer Motion
  const sliderWidth = `${((zoom - 0.5) / 1.5) * 100}%`;
  const glowOpacity = isDragging ? 1 : 0.6;
  const glowScale = isDragging ? 1.1 : 1;

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
      className="relative flex items-center bg-[rgba(var(--theme-background-dark-rgb,22,22,30),0.7)] backdrop-blur-md rounded-full p-3 overflow-hidden"
      style={{
        boxShadow: '0 4px 12px rgba(var(--theme-shadow-rgb,0,0,0),0.1)',
        width: '200px',
        border: '1px solid rgba(var(--theme-primary-rgb,122,162,247),0.2)',
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
          className="text-[rgba(var(--theme-text-rgb,220,220,220),0.8)] mr-3 cursor-pointer"
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
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '30px',
            height: '30px',
            background:
              'radial-gradient(circle, rgba(var(--theme-primary-rgb,122,162,247),0.25) 0%, rgba(var(--theme-primary-rgb,122,162,247),0) 70%)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          animate={{ opacity: glowOpacity, scale: glowScale }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      </motion.div>

      {/* Slider track */}
      <div className="relative flex-1 h-1.5 bg-[rgba(var(--theme-primary-rgb,122,162,247),0.15)] rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-[rgba(var(--theme-primary-rgb,122,162,247),1)] rounded-full"
          style={{ boxShadow: '0 0 8px rgba(var(--theme-primary-rgb,122,162,247),0.6)' }}
          animate={{ width: sliderWidth }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, precision: 0.01 }}
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
          className="text-[rgba(var(--theme-text-rgb,220,220,220),0.8)] ml-3 cursor-pointer"
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
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '30px',
            height: '30px',
            background:
              'radial-gradient(circle, rgba(var(--theme-primary-rgb,122,162,247),0.25) 0%, rgba(var(--theme-primary-rgb,122,162,247),0) 70%)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          animate={{ opacity: glowOpacity, scale: glowScale }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      </motion.div>
    </motion.div>
  );
};

// Export the ZoomSlider component
export default ZoomSlider;
