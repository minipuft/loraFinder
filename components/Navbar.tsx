import React from 'react';
import CurrentDirectoryButton from './CurrentDirectoryButton';
import SearchBar from './SearchBar';
import ZoomSlider from './ZoomSlider';
import styles from '../styles/Navbar.module.css';
import { useState } from 'react';

// Define the props interface for the Navbar component
interface NavbarProps {
  currentDirectory: string;
  onSearch: (query: string) => void;
}

// Define the Navbar component
const Navbar: React.FC<NavbarProps> = ({
  currentDirectory,
  onSearch,
}) => {
  // State to manage zoom level
  const [zoom, setZoom] = useState(1);

  // Handler for zoom changes
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    // Dispatch a custom event to notify ImageFeed of zoom changes
    window.dispatchEvent(new CustomEvent('zoomChange', { detail: newZoom }));
  };

  // Render the Navbar component
  return (
    <nav className={styles.navbar}>
      {/* Left section of the navbar */}
      <div className={styles.leftSection}>
        {/* Display the current directory */}
        <CurrentDirectoryButton currentDirectory={currentDirectory} />
        {/* Search functionality */}
        <SearchBar onSearch={onSearch} />
      </div>
      {/* Right section of the navbar */}
      <div className={styles.rightSection}>
        {/* Zoom control slider */}
        <ZoomSlider zoom={zoom} onZoomChange={handleZoomChange} />
      </div>
    </nav>
  );
};

// Export the Navbar component
export default Navbar;