import { IconAlertCircle, IconFolder, IconLoader2 } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React from 'react';
import { useCurrentDirectory } from '../hooks/query/useCurrentDirectory';

/** Props for the CurrentDirectoryButton component. */
interface CurrentDirectoryButtonProps {
  // currentDirectory: string; // Removed
}

/** CurrentDirectoryButton component that displays the current directory.*/
const CurrentDirectoryButton: React.FC<CurrentDirectoryButtonProps> = () => {
  const { data: currentDirectoryPath, isLoading, isError } = useCurrentDirectory();

  let buttonText = 'Path Unavailable';
  let IconComponent = IconAlertCircle;
  // Base classes for the futuristic look - using theme colors via CSS variables if possible, or direct Tailwind theme colors
  // Assuming --theme-primary-rgb, --theme-accent-peach-rgb, --theme-text-rgb are available or use direct Tailwind like text-primary, bg-primary etc.
  let baseButtonClass =
    'bg-[rgba(var(--theme-background-dark-rgb,22,22,30),0.5)] backdrop-blur-sm border border-[rgba(var(--theme-primary-rgb,122,162,247),0.3)] text-[rgba(var(--theme-text-rgb,220,220,220),0.9)]';
  let iconColorClass = 'text-[rgba(var(--theme-primary-rgb,122,162,247),0.7)]';
  let hoverEffectClass =
    'hover:border-[rgba(var(--theme-primary-rgb,122,162,247),0.7)] hover:bg-[rgba(var(--theme-primary-rgb,122,162,247),0.1)]';
  let isDisabled = false;

  if (isLoading) {
    buttonText = 'Loading Path...';
    IconComponent = IconLoader2; // Animated loader icon
    iconColorClass = 'text-[rgba(var(--theme-accent-cyan-rgb,125,207,255),0.8)] animate-spin';
    baseButtonClass =
      'bg-[rgba(var(--theme-background-dark-rgb,22,22,30),0.5)] backdrop-blur-sm border border-[rgba(var(--theme-accent-cyan-rgb,125,207,255),0.3)] text-[rgba(var(--theme-text-rgb,220,220,220),0.7)] cursor-wait';
    hoverEffectClass = ''; // No hover effect when loading
    isDisabled = true;
  } else if (isError) {
    buttonText = 'Error Loading Path';
    IconComponent = IconAlertCircle;
    iconColorClass = 'text-[rgba(var(--theme-accent-red-rgb,247,118,142),0.8)]'; // Assuming accent-red
    baseButtonClass =
      'bg-[rgba(var(--theme-background-dark-rgb,22,22,30),0.5)] backdrop-blur-sm border border-[rgba(var(--theme-accent-red-rgb,247,118,142),0.3)] text-[rgba(var(--theme-accent-red-rgb,247,118,142),0.9)] cursor-not-allowed';
    hoverEffectClass = ''; // No hover effect on error
    isDisabled = true;
  } else if (currentDirectoryPath) {
    // Show only the last part of the path for brevity, full path on title
    buttonText = currentDirectoryPath.split(/[\\\/]/).pop() || currentDirectoryPath;
    IconComponent = IconFolder;
    // iconColorClass remains default (themed primary)
  }

  return (
    <motion.button
      title={currentDirectoryPath || buttonText}
      className={`relative group flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 ease-in-out overflow-hidden ${baseButtonClass} ${hoverEffectClass}`}
      whileHover={!isDisabled ? { y: -1, scale: 1.02 } : {}}
      whileTap={!isDisabled ? { y: 0, scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      disabled={isDisabled}
    >
      <IconComponent size={18} className={`mr-2 shrink-0 ${iconColorClass}`} />

      <span className="truncate max-w-[150px] group-hover:max-w-[300px] transition-all duration-300 ease-in-out">
        {buttonText}
      </span>
      {/* Subtle animated underline/glow effect on hover - pure CSS within the button component for simplicity */}
      {!isDisabled && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgba(var(--theme-primary-rgb,122,162,247),0.5)] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out origin-center"
          // layoutId="underline" // Can be used if this element is part of a larger animated layout
        />
      )}
    </motion.button>
  );
};

export default CurrentDirectoryButton;
