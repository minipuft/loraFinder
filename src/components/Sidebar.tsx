import React from "react";
import { FolderInfo } from "../types.js";
import styles from "../styles/Sidebar.module.scss";

// Define the props interface for the Sidebar component
interface SidebarProps {
  folders: FolderInfo[];
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
}

// Define the Sidebar component
const Sidebar: React.FC<SidebarProps> = ({
  folders,
  selectedFolder,
  onFolderChange,
}) => {
  return (
    // Main sidebar container
    <aside className="w-64 flex-shrink-0 bg-gray-900 text-peach flex flex-col h-screen">
      <div className={`${styles.sidebar} flex flex-col h-full`}>
        {/* Logo section */}
        <div className={styles.logo}>Lora Finder</div>
        {/* Folder list */}
        <ul className={`${styles.folderList} flex-grow overflow-y-auto`}>
          {/* Map through folders and create buttons for each */}
          {folders.map((folder) => (
            <li key={folder.name} className={styles.folderItem}>
              <button
                onClick={() => onFolderChange(folder.name)}
                className={`${styles.folderButton} ${
                  selectedFolder === folder.name ? styles.selectedFolder : ""
                }`}
              >
                {folder.name}
              </button>
            </li>
          ))}
        </ul>
        {/* Upload button */}
        <div className="p-8 mt-auto">
          <button className={`${styles.uploadButton} w-full`}>Upload</button>
        </div>
      </div>
    </aside>
  );
};

// Export the Sidebar component
export default Sidebar;
