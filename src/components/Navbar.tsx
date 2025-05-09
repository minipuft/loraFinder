import { motion } from 'framer-motion';
import React, { useContext, useRef } from 'react';
import { useAppSettings } from '../contexts';
import { ColorContext } from '../contexts/ColorContext';
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
  const { dominantColors } = useContext(ColorContext);
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

  // Render the Navbar component
  return (
    <motion.div
      ref={ref}
      className={styles.navbar}
      style={
        {
          '--navbar-bg-color1-rgb': dominantColors[0]
            ? hexToRgbString(dominantColors[0])
            : '122, 162, 247',
          '--navbar-bg-color2-rgb': dominantColors[1]
            ? hexToRgbString(dominantColors[1])
            : dominantColors[0]
              ? hexToRgbString(dominantColors[0])
              : '187, 154, 247',
        } as React.CSSProperties
      }
    >
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
              whileHover={{ y: -1, scale: 1.03 /* boxShadow from CSS will apply */ }}
              whileTap={{ y: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </motion.button>
          ))}
        </div>
        <motion.button
          onClick={toggleIsGrouped}
          className={`${styles.viewToggleButton} ${isGrouped ? styles.active : ''}`}
          whileHover={{ y: -1, scale: 1.03 }}
          whileTap={{ y: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {isGrouped ? 'Ungroup' : 'Group'}
        </motion.button>
        {/* Zoom control slider */}
        <ZoomSlider zoom={zoom} onZoomChange={handleZoomChange} />
      </div>
    </motion.div>
  );
});

// Helper function to convert hex to RGB string (e.g., "255,0,0")
// This should ideally be in a utility file
const hexToRgbString = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0,0,0'; // Default to black if conversion fails
};

Navbar.displayName = 'Navbar'; // Add display name for DevTools

// Export the Navbar component
export default Navbar;
