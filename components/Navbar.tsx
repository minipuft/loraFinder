import React from 'react';
import CurrentDirectoryButton from './CurrentDirectoryButton';
import SearchBar from './SearchBar';
import ZoomSlider from './ZoomSlider';
import styles from '../styles/Navbar.module.css';

interface NavbarProps {
  currentDirectory: string;
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentDirectory,
  onSearch,
  zoom,
  onZoomChange,
}) => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        <CurrentDirectoryButton currentDirectory={currentDirectory} />
        <SearchBar onSearch={onSearch} />
      </div>
      <div className={styles.rightSection}>
        <ZoomSlider zoom={zoom} onZoomChange={onZoomChange} />
      </div>
    </nav>
  );
};

export default Navbar;