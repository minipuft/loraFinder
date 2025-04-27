import { motion } from 'framer-motion';
import React, { forwardRef, useEffect, useState } from 'react';
import { FaHome } from 'react-icons/fa';
import { useFolders } from '../hooks/query/useFolders';
import styles from '../styles/Sidebar.module.scss';
import { getHomeDirectory, setHomeDirectory } from '../utils/settings';

// Define the props interface for the Sidebar component
interface SidebarProps {
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
}

// Use forwardRef to allow passing ref to the underlying motion.div
const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  (
    { selectedFolder, onFolderChange },
    ref // Receive the ref
  ) => {
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
          ref={ref}
          className={`${styles.sidebar} ${styles.loading}`}
          style={{ opacity: 0 }}
        >
          Loading folders...
        </motion.div>
      );
    }

    // Render error state
    if (isError) {
      return (
        <motion.div
          ref={ref}
          className={`${styles.sidebar} ${styles.error}`}
          style={{ opacity: 0 }}
        >
          Error: {error?.message || 'Failed to load folders'}
        </motion.div>
      );
    }

    // Render the main sidebar
    return (
      // Main sidebar container
      <motion.div ref={ref} className={styles.sidebar}>
        <div className={`${styles.sidebarInner} flex flex-col h-full`}>
          {/* Logo section */}
          <div className={styles.logo}>MediaFlow</div>
          {/* Folder list */}
          <ul className={`${styles.folderList} flex-grow overflow-y-auto`}>
            {/* Map through folders (from hook) and create buttons for each */}
            {(folders ?? []).map(folder => (
              <li
                key={folder.name}
                className={`${styles.folderItem} group ${selectedFolder === folder.name ? styles.selectedFolder : ''}`}
                // Handle folder selection on the list item itself for better structure
                onClick={() => onFolderChange(folder.name)}
                role="button" // Add role for accessibility
                tabIndex={0} // Make it focusable
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') onFolderChange(folder.name);
                }} // Keyboard accessibility
              >
                <span className={styles.folderName}>{folder.name}</span>
                {/* Set Home button is now a sibling, not a child */}
                <button
                  onClick={e => handleSetHome(folder.name, e)}
                  className={`${styles.setHomeButton} ${
                    folder.name === currentHomeDir
                      ? styles.isHome
                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' // Ensure visibility on focus too
                  }`}
                  title={`Set ${folder.name} as home directory`}
                  aria-label={`Set ${folder.name} as home directory`} // Better accessibility
                  tabIndex={0} // Make sure it's focusable independently
                >
                  <FaHome />
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
  }
);

Sidebar.displayName = 'Sidebar'; // Add display name for DevTools

// Export the Sidebar component
export default Sidebar;
