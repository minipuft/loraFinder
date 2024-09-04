import React from 'react';
import CurrentDirectoryButton from './CurrentDirectoryButton';
import SearchBar from './SearchBar';
import ZoomSlider from './ZoomSlider';
import styles from '../styles/Navbar.module.css';

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
        {/* Add this button */}
        <button onClick={onGroupToggle} className={styles.viewToggleButton}>
          {isGrouped ? 'Ungroup' : 'Group'}
        </button>
        {/* Zoom control slider */}
        <ZoomSlider zoom={zoom} onZoomChange={onZoomChange} />
      </div>
    </nav>
  );
};

// Export the Navbar component
export default Navbar;