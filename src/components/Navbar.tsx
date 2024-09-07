import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import CurrentDirectoryButton from './CurrentDirectoryButton';
import SearchBar from './SearchBar';
import ZoomSlider from './ZoomSlider';
import styles from '../styles/Navbar.module.scss';

// Update the props interface for the Navbar component
interface NavbarProps {
  currentDirectory: string;
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isGrouped: boolean;
  onGroupToggle: () => void;
}

// Define the Navbar component
const Navbar: React.FC<NavbarProps> = ({
  currentDirectory,
  onSearch,
  zoom,
  onZoomChange,
  isGrouped,
  onGroupToggle,
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
        <CurrentDirectoryButton currentDirectory={currentDirectory} />
        {/* Search functionality */}
        <SearchBar onSearch={onSearch} />
      </div>
      {/* Right section of the navbar */}
      <div className={styles.rightSection}>
        {/* Add this button */}
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