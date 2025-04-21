import { motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import styles from '../styles/Navbar.module.scss';
import { ViewMode } from '../types/index.js';
import CurrentDirectoryButton from './CurrentDirectoryButton';
import SearchBar from './SearchBar';
import ZoomSlider from './ZoomSlider';

// Update the props interface for the Navbar component
interface NavbarProps {
  // currentDirectory: string; // Removed: Fetched by CurrentDirectoryButton
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isGrouped: boolean;
  onGroupToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Define the Navbar component
const Navbar: React.FC<NavbarProps> = ({
  // currentDirectory, // Removed
  onSearch,
  zoom,
  onZoomChange,
  isGrouped,
  onGroupToggle,
  viewMode,
  onViewModeChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

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
    <motion.div
      className={styles.navbar}
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <svg ref={svgRef} className={styles.navbarBackground}>
        <path d="M0,0 Q50,20 100,10 T200,30 T300,5 T400,25 V100 Q350,80 300,90 T200,70 T100,95 T0,75 Z" />
      </svg>
      {/* Left section of the navbar */}
      <div className={styles.leftSection}>
        {/* Display the current directory */}
        <CurrentDirectoryButton /> {/* No prop needed */}
        {/* Search functionality */}
        <SearchBar onSearch={onSearch} />
      </div>
      {/* Right section of the navbar */}
      <div className={styles.rightSection}>
        {/* View mode toggle buttons */}
        <div className={styles.viewModeButtons}>
          {Object.values(ViewMode).map(mode => (
            <motion.button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`${styles.viewModeButton} ${viewMode === mode ? styles.active : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </motion.button>
          ))}
        </div>
        <motion.button
          onClick={onGroupToggle}
          className={styles.viewToggleButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isGrouped ? 'Ungroup' : 'Group'}
        </motion.button>
        {/* Zoom control slider */}
        <ZoomSlider zoom={zoom} onZoomChange={onZoomChange} />
      </div>
    </motion.div>
  );
};

// Export the Navbar component
export default Navbar;
