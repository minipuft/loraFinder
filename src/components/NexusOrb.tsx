import {
  IconBoxMultiple,
  IconCarouselHorizontal,
  IconColumns,
  IconLayoutGrid,
  IconRectangleVertical,
  IconSearch,
  IconX,
  IconZoomIn,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import React, { CSSProperties, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { ColorContext } from '../contexts/ColorContext';
import { useCurrentDirectory } from '../hooks/query/useCurrentDirectory';
import useViewport from '../hooks/useViewport';
import styles from '../styles/NexusOrb.module.scss';
import { ViewMode } from '../types';
import NexusOrbMenuItem from './NexusOrbMenuItem';

// Helper to convert hex to RGB string - ideally from utils
const hexToRgbString = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '122, 162, 247'; // Default to primary if conversion fails
};

const ORB_CSS_OFFSET = 20;
const NEXUS_ORB_SIZE = 40;

// Default/current geometry for the menu - will be dynamic in Phase 2
// const CURRENT_MENU_RADIUS = 95; // Will become dynamic
// const CURRENT_FAN_ARC_DEGREES = 170; // Will become dynamic

const NexusOrb: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isZoomSliderActive, setIsZoomSliderActive] = useState(false);
  const [menuOffset, setMenuOffset] = useState({ x: 0, y: 0 });
  const [orbViewportCenter, setOrbViewportCenter] = useState<{ x: number; y: number } | null>(null);
  const orbContainerRef = useRef<HTMLDivElement>(null);

  const { data: currentDirectoryPath, isLoading, isError } = useCurrentDirectory();
  const { dominantColors } = useContext(ColorContext);
  const {
    viewMode,
    handleViewModeChange,
    isGrouped,
    toggleIsGrouped,
    handleSearch,
    zoom,
    handleZoomChange,
  } = useAppSettings();
  const viewport = useViewport();

  const primaryColorRgb = dominantColors[0] ? hexToRgbString(dominantColors[0]) : '122, 162, 247';
  const secondaryColorRgb = dominantColors[1] ? hexToRgbString(dominantColors[1]) : primaryColorRgb;

  const orbStyle: CSSProperties = {
    '--nexus-glow-color-default': `rgba(${primaryColorRgb}, 0.5)`,
    '--nexus-bg-color-default': `rgba(${primaryColorRgb}, 0.2)`,
    '--nexus-text-color': `rgba(220, 220, 220, 0.9)`,
    '--nexus-pulse-color': `rgba(${secondaryColorRgb}, 0.7)`,
    '--theme-primary-rgb': primaryColorRgb,
    '--theme-accent-cyan-rgb': secondaryColorRgb,
    '--theme-text-rgb': '220, 220, 220',
    '--theme-background-dark-rgb': '22, 22, 30',
  } as CSSProperties;

  let directoryText = 'Loading Path...';
  if (isError) directoryText = 'Error: Path';
  else if (!isLoading && currentDirectoryPath) {
    directoryText = currentDirectoryPath.split(/[\\\/]/).pop() || currentDirectoryPath;
  }

  const orbBaseVariants = {
    rest: {
      scale: 1,
    },
    hover: {
      scale: 1.1,
    },
    menuActive: {
      scale: 0.95,
    },
  };

  const textVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
    if (isSearchActive) setIsSearchActive(false);
    if (isZoomSliderActive) setIsZoomSliderActive(false);
    if (isMenuOpen) setSearchQuery('');
  };

  const activateSearch = () => {
    setIsSearchActive(true);
    setIsZoomSliderActive(false);
  };

  const deactivateSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
  };

  const submitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      handleSearch(searchQuery.trim());
    }
  };

  const activateZoomSlider = () => {
    setIsZoomSliderActive(true);
    setIsSearchActive(false);
  };

  const deactivateZoomSlider = () => {
    setIsZoomSliderActive(false);
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  let effectiveMenuItems = [
    {
      id: isSearchActive ? 'search-input' : 'search',
      label: isSearchActive ? 'Submit Search' : 'Search',
      icon: isSearchActive ? <IconX /> : <IconSearch />,
      onClick: isSearchActive ? submitSearch : activateSearch,
      isSearchInput: isSearchActive,
      onCloseSearch: deactivateSearch,
      ...(isSearchActive && {
        searchQuery: searchQuery,
        onSearchQueryChange: handleSearchInputChange,
      }),
    },
    {
      id: ViewMode.GRID,
      label: 'Grid View',
      icon: <IconLayoutGrid />,
      onClick: () => handleViewModeChange(ViewMode.GRID),
      isActive: viewMode === ViewMode.GRID,
    },
    {
      id: ViewMode.MASONRY,
      label: 'Masonry View',
      icon: <IconColumns />,
      onClick: () => handleViewModeChange(ViewMode.MASONRY),
      isActive: viewMode === ViewMode.MASONRY,
    },
    {
      id: ViewMode.BANNER,
      label: 'Banner View',
      icon: <IconRectangleVertical />,
      onClick: () => handleViewModeChange(ViewMode.BANNER),
      isActive: viewMode === ViewMode.BANNER,
    },
    {
      id: ViewMode.CAROUSEL,
      label: 'Carousel View',
      icon: <IconCarouselHorizontal />,
      onClick: () => handleViewModeChange(ViewMode.CAROUSEL),
      isActive: viewMode === ViewMode.CAROUSEL,
    },
    {
      id: 'group',
      label: isGrouped ? 'Ungroup' : 'Group',
      icon: <IconBoxMultiple />,
      onClick: toggleIsGrouped,
      isActive: isGrouped,
    },
    {
      id: isZoomSliderActive ? 'zoom-slider-active' : 'zoom',
      label: isZoomSliderActive ? 'Adjust Zoom' : 'Zoom',
      icon: isZoomSliderActive ? <IconX /> : <IconZoomIn />,
      onClick: isZoomSliderActive ? deactivateZoomSlider : activateZoomSlider,
      isZoomSliderInput: isZoomSliderActive,
      onCloseZoom: deactivateZoomSlider,
      ...(isZoomSliderActive && { zoomValue: zoom, onZoomChange: handleZoomChange }),
    },
  ];

  if (isSearchActive) {
    effectiveMenuItems = effectiveMenuItems.filter(item => item.id === 'search-input');
  } else if (isZoomSliderActive) {
    effectiveMenuItems = effectiveMenuItems.filter(item => item.id === 'zoom-slider-active');
  }

  const { currentMenuRadius, currentFanArcDegrees } = useMemo(() => {
    const itemCount = effectiveMenuItems.length;
    let radius = 95;
    let arcDegrees = 170;

    if (itemCount <= 0) {
      radius = 85;
      arcDegrees = 0;
    } else if (itemCount === 1) {
      radius = 85;
      arcDegrees = 0;
    } else if (itemCount === 2) {
      radius = 90;
      arcDegrees = 60;
    } else if (itemCount === 3) {
      radius = 95;
      arcDegrees = 100;
    } else if (itemCount === 4) {
      radius = 100;
      arcDegrees = 130;
    } else if (itemCount === 5) {
      radius = 105;
      arcDegrees = 160;
    } else {
      radius = 110;
      arcDegrees = 180;
    }
    return { currentMenuRadius: radius, currentFanArcDegrees: arcDegrees };
  }, [effectiveMenuItems.length]);

  const currentWindowCenter = useMemo(() => {
    if (viewport.rect.width && viewport.rect.height) {
      return { x: viewport.rect.width / 2, y: viewport.rect.height / 2 };
    }
    return null;
  }, [viewport.rect.width, viewport.rect.height]);

  useEffect(() => {
    if (orbContainerRef.current) {
      const rect = orbContainerRef.current.getBoundingClientRect();
      setOrbViewportCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const orbCenterX = ORB_CSS_OFFSET + NEXUS_ORB_SIZE / 2;
      const orbCenterYFromBottom = ORB_CSS_OFFSET + NEXUS_ORB_SIZE / 2;
      const orbCenterYFromTop = viewportHeight - orbCenterYFromBottom;

      const maxMenuExtent = currentMenuRadius + NEXUS_ORB_SIZE / 2;
      const padding = 10;

      let offsetX = 0;
      let offsetY = 0;
      if (orbCenterX - maxMenuExtent < 0) {
        offsetX = -(orbCenterX - maxMenuExtent) + padding;
      }
      if (orbCenterX + maxMenuExtent > viewportWidth) {
        offsetX = viewportWidth - (orbCenterX + maxMenuExtent) - padding;
      }
      if (orbCenterYFromTop - maxMenuExtent < 0) {
        offsetY = -(orbCenterYFromTop - maxMenuExtent) + padding;
      }
      if (orbCenterYFromTop + maxMenuExtent > viewportHeight) {
        offsetY = viewportHeight - (orbCenterYFromTop + maxMenuExtent) - padding;
      }
      setMenuOffset({ x: offsetX, y: offsetY });
    } else {
      setMenuOffset({ x: 0, y: 0 });
    }
  }, [isMenuOpen, currentMenuRadius]);

  let currentOrbAnimateState = 'rest';
  if (isMenuOpen) {
    currentOrbAnimateState = 'menuActive';
  } else if (isHovered && !isSearchActive && !isZoomSliderActive) {
    currentOrbAnimateState = 'hover';
  }

  return (
    <motion.div
      ref={orbContainerRef}
      className={styles.nexusOrbContainer}
      style={orbStyle}
      onHoverStart={() =>
        !isMenuOpen && !isSearchActive && !isZoomSliderActive && setIsHovered(true)
      }
      onHoverEnd={() => setIsHovered(false)}
      tabIndex={0}
      onClick={!isMenuOpen || isSearchActive || isZoomSliderActive ? toggleMenu : undefined}
      onKeyPress={e =>
        e.key === 'Enter' &&
        (!isMenuOpen || isSearchActive || isZoomSliderActive ? toggleMenu : undefined)
      }
    >
      <motion.div
        className={`${styles.orb} ${isMenuOpen ? styles.orbMenuActive : ''}`}
        variants={orbBaseVariants}
        initial="rest"
        animate={currentOrbAnimateState}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      />
      <AnimatePresence>
        {isHovered && !isMenuOpen && !isSearchActive && !isZoomSliderActive && (
          <motion.div
            className={styles.directoryDisplay}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {directoryText}
          </motion.div>
        )}
      </AnimatePresence>
      <div
        style={{
          position: 'absolute',
          top: `calc(var(--nexus-orb-size, 40px) / 2 + ${menuOffset.y}px)`,
          left: `calc(var(--nexus-orb-size, 40px) / 2 + ${menuOffset.x}px)`,
        }}
      >
        <AnimatePresence>
          {isMenuOpen &&
            effectiveMenuItems.map((item: any, index) => (
              <NexusOrbMenuItem
                key={item.id}
                index={index}
                totalItems={effectiveMenuItems.length}
                icon={item.icon}
                label={item.label}
                onClick={() => {
                  item.onClick();
                  if (
                    item.id !== 'search' &&
                    item.id !== 'zoom' &&
                    !item.isSearchInput &&
                    !item.isZoomSliderInput
                  ) {
                    setIsMenuOpen(false);
                  }
                }}
                isOpen={isMenuOpen}
                isActive={item.isActive}
                isSearchInput={item.isSearchInput}
                searchQuery={searchQuery}
                onSearchQueryChange={handleSearchInputChange}
                onSearchSubmit={submitSearch}
                onCloseSearch={deactivateSearch}
                isZoomSliderInput={item.isZoomSliderInput}
                zoomValue={item.zoomValue}
                onZoomChange={item.onZoomChange}
                onCloseZoom={item.onCloseZoom || deactivateZoomSlider}
                orbViewportCenter={orbViewportCenter}
                windowCenter={currentWindowCenter}
                menuRadius={currentMenuRadius}
                fanArcDegrees={currentFanArcDegrees}
              />
            ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NexusOrb;
