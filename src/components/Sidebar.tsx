import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { FaHome } from 'react-icons/fa';
import { useFolders } from '../hooks/query/useFolders';
import styles from '../styles/Sidebar.module.scss';
import { getHomeDirectory, setHomeDirectory } from '../utils/settings';

// Define the props interface for the Sidebar component
interface SidebarProps {
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
}

// Define the Sidebar component
const Sidebar: React.FC<SidebarProps> = ({ selectedFolder, onFolderChange }) => {
  // Call the hook to fetch folders
  const { data: folders, isLoading, isError, error } = useFolders();
  // State to track the current home directory for styling
  const [currentHomeDir, setCurrentHomeDir] = useState<string | null>(null);

  // Effect to load the home directory on mount
  useEffect(() => {
    setCurrentHomeDir(getHomeDirectory());
  }, []);

  // Handler to set a new home directory
  const handleSetHome = (folderPath: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent folder selection when clicking set home
    setHomeDirectory(folderPath);
    setCurrentHomeDir(folderPath);
    console.log('Set home directory:', folderPath);
  };

  // Render loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className={`${styles.sidebar} ${styles.loading}`}
      >
        Loading folders...
      </motion.div>
    );
  }

  // Render error state
  if (isError) {
    return (
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className={`${styles.sidebar} ${styles.error}`}
      >
        Error: {error?.message || 'Failed to load folders'}
      </motion.div>
    );
  }

  // Render the main sidebar
  return (
    // Main sidebar container
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 120 }}
      className={styles.sidebar}
    >
      <div className={`${styles.sidebar} flex flex-col h-full`}>
        {/* Logo section */}
        <div className={styles.logo}>Lora Finder</div>
        {/* Folder list */}
        <ul className={`${styles.folderList} flex-grow overflow-y-auto`}>
          {/* Map through folders (from hook) and create buttons for each */}
          {(folders ?? []).map(folder => (
            <li key={folder.name} className={`${styles.folderItem} group`}>
              <button
                onClick={() => {
                  onFolderChange(folder.name);
                }}
                className={`${styles.folderButton} ${
                  selectedFolder === folder.name ? styles.selectedFolder : ''
                }`}
              >
                <span className={styles.folderName}>{folder.name}</span>
                <button
                  onClick={e => handleSetHome(folder.name, e)}
                  className={`${styles.setHomeButton} ${folder.name === currentHomeDir ? styles.isHome : 'opacity-0 group-hover:opacity-100'}`}
                  title={`Set ${folder.name} as home directory`}
                >
                  <FaHome />
                </button>
              </button>
            </li>
          ))}
        </ul>
        {/* Upload button */}
        <div className="p-8 mt-auto">
          <button className={`${styles.uploadButton} w-full`}>Upload</button>
        </div>
      </div>
    </motion.div>
  );
};

// Export the Sidebar component
export default Sidebar;
