import React from 'react';
import { IconFolder } from '@tabler/icons-react';
import { motion } from 'framer-motion';

/** Props for the CurrentDirectoryButton component. */
interface CurrentDirectoryButtonProps {
  currentDirectory: string;
}

/** CurrentDirectoryButton component that displays the current directory.*/
const CurrentDirectoryButton: React.FC<CurrentDirectoryButtonProps> = ({ currentDirectory }) => {
  return (
    <motion.button
      className="flex items-center bg-gray-700 px-3 py-1 rounded-md text-peach text-sm hover:bg-gray-600 transition-all duration-300 ease-in-out"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Folder icon */}
      <IconFolder size={16} className="mr-2 text-yellow-500" />
      
      {/* Current directory path */}
      <motion.div
        className="truncate max-w-xs"
        initial={{ clipPath: 'circle(0% at 50% 50%)' }}
        animate={{ clipPath: 'circle(100% at 50% 50%)' }}
        transition={{ duration: 0.5 }}
      >
        <span>{currentDirectory}</span>
      </motion.div>
    </motion.button>
  );
};

export default CurrentDirectoryButton;
