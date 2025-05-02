import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout.js';
import MainContent from '../components/MainContent.js';
import { useAnimationController } from '../contexts/AnimationControllerContext';
import { useAnimationPipeline } from '../hooks/useAnimationPipeline';
import { ViewMode } from '../types/index.js';
import { getHomeDirectory } from '../utils/settings.js';

/**
 * Home component - the main page of the application.
 * It manages the overall state and layout of the app.
 *
 * @component
 * @returns {JSX.Element} The main application page.
 */
const Home: React.FC = () => {
  // State declarations for managing application data and UI
  const [selectedFolder, setSelectedFolder] = useState<string>(() => {
    return getHomeDirectory() || '';
  });
  const [zoom, setZoom] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGrouped, setIsGrouped] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);

  // Refs
  const mainScrollRef = useRef<HTMLElement>(null);
  const layoutWrapperRef = useRef<HTMLDivElement>(null); // Ref for the outer wrapper div
  const sidebarRef = useRef<HTMLDivElement>(null); // Ref for Sidebar
  const navbarRef = useRef<HTMLDivElement>(null); // Ref for Navbar
  const contentAreaRef = useRef<HTMLDivElement>(null); // Ref for MainContent wrapper area

  // --- Animation Setup ---
  const homeEnterPipeline = useAnimationPipeline({ paused: true });
  const { trigger } = useAnimationController(); // Keep trigger if needed elsewhere

  // Configure the entrance animation steps once (Existing Effect - Updated Structure)
  useEffect(() => {
    if (
      layoutWrapperRef.current &&
      sidebarRef.current &&
      navbarRef.current &&
      contentAreaRef.current
    ) {
      homeEnterPipeline
        .addStep({
          target: layoutWrapperRef.current,
          preset: 'fadeIn',
          vars: { duration: 0.4 }, // Duration moved to vars
          position: '+=0.1', // Delay moved to position
        })
        .addStep({
          target: sidebarRef.current,
          preset: 'fadeIn',
          vars: { duration: 0.4 }, // Duration moved to vars
          position: '+=0.2', // Delay moved to position
        })
        .addStep({
          target: navbarRef.current,
          preset: 'fadeIn',
          vars: { duration: 0.4 }, // Duration moved to vars
          position: '+=0.2', // Delay moved to position
        })
        .addStep({
          target: contentAreaRef.current,
          preset: 'fadeIn',
          vars: { duration: 0.5 }, // Duration moved to vars
          position: '+=0.3', // Delay moved to position
        });
      // Play the animation immediately on mount now
      homeEnterPipeline.play();
    }
    // Cleanup on unmount
    return () => {
      homeEnterPipeline.kill();
    };
  }, [homeEnterPipeline]); // Depends only on the pipeline instance now

  /**
   * Handler for folder selection change.
   * Updates the selected folder state.
   * @param {string} folder - The newly selected folder.
   */
  const handleFolderChange = (folder: string) => {
    setSelectedFolder(folder);
  };

  /**
   * Handler for zoom level change.
   * Updates the zoom state.
   * @param {number} newZoom - The new zoom level.
   */
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  /**
   * Handler for search query change.
   * Updates the search query state.
   * @param {string} query - The new search query.
   */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Search result display needs to be handled
  };

  /**
   * Handler for file upload completion.
   * Refreshes the images in the current folder.
   * TODO: Replace with query invalidation using queryClient
   */
  const handleUploadComplete = () => {
    // Example: queryClient.invalidateQueries(['images', selectedFolder]);
    console.log('TODO: Invalidate query for folder:', selectedFolder);
  };

  /**
   * Handler for grouping toggle.
   * Toggles the grouping state.
   */
  const handleGroupToggle = () => {
    setIsGrouped(prevState => !prevState);
  };

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
  };

  // Render the main layout with all necessary props
  // Note: 'folders' & 'currentDirectory' props are removed from Layout
  return (
    // Remove initial style - let it render normally
    <div ref={layoutWrapperRef}>
      <Layout
        ref={layoutWrapperRef} // Pass ref even if not animating for now
        selectedFolder={selectedFolder}
        onFolderChange={handleFolderChange}
        onSearch={handleSearch}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        isGrouped={isGrouped}
        onGroupToggle={handleGroupToggle}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        mainRef={mainScrollRef} // For scrolling
        // Pass down refs for internal elements
        sidebarRef={sidebarRef}
        navbarRef={navbarRef}
        contentAreaRef={contentAreaRef}
        // Pass MainContent explicitly as a prop
        mainContentSlot={
          <MainContent
            zoom={zoom}
            searchQuery={searchQuery}
            selectedFolder={selectedFolder}
            isGrouped={isGrouped}
            viewMode={viewMode}
            scrollContainerRef={mainScrollRef}
          />
        }
      />
    </div>
  );
};

export default Home;
