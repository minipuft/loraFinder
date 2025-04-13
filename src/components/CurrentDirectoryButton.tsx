import { IconFolder } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React from 'react';
import { useCurrentDirectory } from '../hooks/query/useCurrentDirectory';

/** Props for the CurrentDirectoryButton component. */
interface CurrentDirectoryButtonProps {
  // currentDirectory: string; // Removed
}

/** CurrentDirectoryButton component that displays the current directory.*/
const CurrentDirectoryButton: React.FC<CurrentDirectoryButtonProps> = () => {
  // Fetch the current directory using the hook
  const { data: currentDirectory, isLoading, isError } = useCurrentDirectory();

  // Determine button content based on loading/error state
  let buttonContent = '...'; // Loading state
  let buttonClass = 'bg-gray-600 text-gray-400 cursor-not-allowed';
  let iconColor = 'text-gray-500';

  if (isError) {
    buttonContent = 'Error';
    buttonClass = 'bg-red-800 text-red-200 cursor-not-allowed';
    iconColor = 'text-red-400';
  } else if (!isLoading && currentDirectory) {
    buttonContent = currentDirectory;
    buttonClass = 'bg-gray-700 text-peach hover:bg-gray-600'; // Original classes
    iconColor = 'text-yellow-500'; // Original color
  }

  return (
    <motion.button
      className={`flex items-center px-3 py-1 rounded-md text-sm transition-all duration-300 ease-in-out ${buttonClass}`}
      whileHover={!isLoading && !isError ? { scale: 1.05 } : {}}
      whileTap={!isLoading && !isError ? { scale: 0.95 } : {}}
      disabled={isLoading || isError}
    >
      {/* Folder icon */}
      <IconFolder size={16} className={`mr-2 ${iconColor}`} />

      {/* Current directory path or status */}
      <motion.div
        className="truncate max-w-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <span>{buttonContent}</span>
      </motion.div>
    </motion.button>
  );
};

export default CurrentDirectoryButton;
