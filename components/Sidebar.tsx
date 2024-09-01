import React from 'react';
import { FolderInfo } from '../types';
import styles from '../styles/Sidebar.module.css';

interface SidebarProps {
  folders: FolderInfo[];
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ folders, selectedFolder, onFolderChange }) => {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-900 text-peach overflow-y-auto">
      <div className={styles.sidebar}>
        <div className={styles.logo}>Lora Finder</div>
        <ul className={styles.folderList}>
          {folders.map((folder) => (
            <li key={folder.name} className={styles.folderItem}>
              <button
                onClick={() => onFolderChange(folder.name)}
                className={`${styles.folderButton} ${selectedFolder === folder.name ? styles.selectedFolder : ''}`}
              >
                {folder.name}
              </button>
            </li>
          ))}
        </ul>
        <button className={styles.uploadButton}>Upload</button>
      </div>
    </aside>
  );
};

export default Sidebar;