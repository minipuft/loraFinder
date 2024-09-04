import React from 'react';
import { IconFolder } from '@tabler/icons-react';

/** Props for the CurrentDirectoryButton component. */
interface CurrentDirectoryButtonProps {
  currentDirectory: string;
}

/** CurrentDirectoryButton component that displays the current directory.*/
const CurrentDirectoryButton: React.FC<CurrentDirectoryButtonProps> = ({ currentDirectory }) => {
  return (
    <button className="flex items-center bg-gray-700 px-3 py-1 rounded-md text-peach text-sm hover:bg-gray-600 transition-all duration-300 ease-in-out">
      {/* Folder icon */}
      <IconFolder size={16} className="mr-2 text-yellow-500" />
      
      {/* Current directory path */}
      <span className="truncate max-w-xs">{currentDirectory}</span>
    </button>
  );
};

export default CurrentDirectoryButton;
