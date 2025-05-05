import { motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import { useAppSettings } from '../contexts';
import styles from '../styles/Navbar.module.scss';
import { ViewMode } from '../types/index.js';
import CurrentDirectoryButton from './CurrentDirectoryButton';
import SearchBar from './SearchBar';
import ZoomSlider from './ZoomSlider';

// Update the props interface for the Navbar component
interface NavbarProps {
  // No props needed other than the optional ref managed by forwardRef
  ref?: React.Ref<HTMLDivElement>;
}

// Use forwardRef directly without wrapping in React.FC for better type compatibility
const Navbar = React.forwardRef<HTMLDivElement, NavbarProps>(({}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    selectedFolder,
    handleSearch,
    zoom,
    handleZoomChange,
    isGrouped,
    toggleIsGrouped,
    viewMode,
    handleViewModeChange,
  } = useAppSettings();

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      const animate = () => {
        const path = svg.querySelector('path');
        if (path) {
          const length = path.getTotalLength();
          path.style.strokeDasharray = `${length} ${length}`;
          path.style.strokeDashoffset = `${length}`;
          path.getBoundingClientRect();
          path.style.transition = 'stroke-dashoffset 2s ease-in-out';
          path.style.strokeDashoffset = '0';
        }
      };
      animate();
    }
  }, []);

  // Render the Navbar component
  return (
    <motion.div ref={ref} className={styles.navbar}>
      <svg ref={svgRef} className={styles.navbarBackground}>
        <path d="M0,0 Q50,20 100,10 T200,30 T300,5 T400,25 V100 Q350,80 300,90 T200,70 T100,95 T0,75 Z" />
      </svg>
      {/* Left section of the navbar */}
      <div className={styles.leftSection}>
        {/* Display the current directory */}
        <CurrentDirectoryButton />
        {/* Search functionality */}
        <SearchBar onSearch={handleSearch} />
      </div>
      {/* Right section of the navbar */}
      <div className={styles.rightSection}>
        {/* View mode toggle buttons */}
        <div className={styles.viewModeButtons}>
          {[ViewMode.GRID, ViewMode.MASONRY, ViewMode.BANNER, ViewMode.CAROUSEL].map(mode => (
            <motion.button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`${styles.viewModeButton} ${viewMode === mode ? styles.active : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </motion.button>
          ))}
        </div>
        <motion.button
          onClick={toggleIsGrouped}
          className={styles.viewToggleButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isGrouped ? 'Ungroup' : 'Group'}
        </motion.button>
        {/* Zoom control slider */}
        <ZoomSlider zoom={zoom} onZoomChange={handleZoomChange} />
      </div>
    </motion.div>
  );
});

Navbar.displayName = 'Navbar'; // Add display name for DevTools

// Export the Navbar component
export default Navbar;
