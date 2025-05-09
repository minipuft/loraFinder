import { IconX } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import styles from '../styles/NexusOrbMenuItem.module.scss';
import ZoomSliderControl from './ZoomSliderControl';

interface NexusOrbMenuItemProps {
  index: number; // For stagger & positioning calculations
  totalItems: number;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isOpen: boolean;
  isActive?: boolean; // For view modes, etc.
  // New props for search functionality
  isSearchInput?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit?: (event?: React.FormEvent<HTMLFormElement>) => void; // Optional event
  onCloseSearch?: () => void;
  // Zoom props - New
  isZoomSliderInput?: boolean;
  zoomValue?: number;
  onZoomChange?: (newZoom: number) => void;
  onCloseZoom?: () => void;
}

const RADIUS = 80; // Radius of the circle menu in pixels
const ITEM_ANGLE_OFFSET = -90; // Start first item at the top (0 degrees is right)

const NexusOrbMenuItem: React.FC<NexusOrbMenuItemProps> = ({
  index,
  totalItems,
  icon,
  label,
  onClick,
  isOpen,
  isActive,
  isSearchInput,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onCloseSearch,
  isZoomSliderInput,
  zoomValue,
  onZoomChange,
  onCloseZoom,
}) => {
  const angleIncrement = 360 / totalItems;
  const targetAngle = ITEM_ANGLE_OFFSET + index * angleIncrement;

  const itemPositionVariants = {
    hidden: {
      x: 0,
      y: 0,
      opacity: 0,
      scale: 0.5,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
    visible: {
      x: RADIUS * Math.cos((targetAngle * Math.PI) / 180),
      y: RADIUS * Math.sin((targetAngle * Math.PI) / 180),
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: index * 0.03, // Staggered appearance
      },
    },
  };

  const contentVariants = {
    iconInitial: { opacity: 0, scale: 0.7 },
    iconAnimate: { opacity: 1, scale: 1, transition: { duration: 0.2, delay: 0.1 } }, // Slight delay for smoother feel
    iconExit: { opacity: 0, scale: 0.7, transition: { duration: 0.2 } },
    formInitial: { opacity: 0, scale: 0.8, width: '80%' },
    formAnimate: {
      opacity: 1,
      scale: 1,
      width: '100%',
      transition: { duration: 0.3, ease: 'circOut', delay: 0.1 },
    },
    formExit: {
      opacity: 0,
      scale: 0.8,
      width: '80%',
      transition: { duration: 0.2, ease: 'circIn' },
    },
    sliderInitial: { opacity: 0, y: 10, scale: 0.9 },
    sliderAnimate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.25, ease: 'circOut', delay: 0.1 },
    },
    sliderExit: { opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.2, ease: 'circIn' } },
  };

  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSearchInput && !isZoomSliderInput) {
      onClick();
    }
  };

  let contentKey: string;
  let currentAriaLabel: string;
  let motionContent: React.ReactNode;

  if (isSearchInput && onSearchQueryChange && onSearchSubmit && onCloseSearch) {
    contentKey = 'search-form';
    currentAriaLabel = 'Search input area';
    motionContent = (
      <motion.form
        key={contentKey}
        className={styles.searchInputContainer}
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          onSearchSubmit(e);
        }}
        variants={contentVariants}
        initial="formInitial"
        animate="formAnimate"
        exit="formExit"
      >
        <input
          type="text"
          className={styles.searchInputField}
          value={searchQuery}
          onChange={onSearchQueryChange}
          placeholder="Search the Aether..."
          autoFocus
          onClick={e => e.stopPropagation()}
        />
        <button
          type="button"
          className={styles.searchCloseButton}
          onClick={e => {
            e.stopPropagation();
            onCloseSearch();
          }}
          aria-label="Close search"
        >
          <IconX size={18} />
        </button>
      </motion.form>
    );
  } else if (isZoomSliderInput && zoomValue !== undefined && onZoomChange && onCloseZoom) {
    contentKey = 'zoom-slider';
    currentAriaLabel = 'Zoom slider control';
    motionContent = (
      <motion.div
        key={contentKey}
        variants={contentVariants}
        initial="sliderInitial"
        animate="sliderAnimate"
        exit="sliderExit"
        className={styles.zoomSliderWrapper}
      >
        <ZoomSliderControl value={zoomValue} onChange={onZoomChange} onClose={onCloseZoom} />
      </motion.div>
    );
  } else {
    contentKey = 'icon-display';
    currentAriaLabel = label;
    motionContent = (
      <motion.div
        key={contentKey}
        variants={contentVariants}
        initial="iconInitial"
        animate="iconAnimate"
        exit="iconExit"
        className={styles.iconDisplayContainer}
      >
        {icon}
        <span className={styles.tooltip}>{label}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`${styles.menuItem} ${isActive ? styles.active : ''} ${isSearchInput ? styles.searchInputMode : ''} ${isZoomSliderInput ? styles.zoomSliderMode : ''}`}
      variants={itemPositionVariants}
      initial="hidden"
      animate={isOpen ? 'visible' : 'hidden'}
      exit="hidden"
      onClick={handleItemClick}
      aria-label={currentAriaLabel}
    >
      <AnimatePresence mode="wait">{motionContent}</AnimatePresence>
    </motion.div>
  );
};

export default NexusOrbMenuItem;
