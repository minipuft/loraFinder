import React, { useRef, useState } from 'react';
import Layout from '../components/Layout.js';
import MainContent from '../components/MainContent.js';
// import { getFolders, getImages } from '../lib/api.js'; // getFolders no longer needed here
import { ViewMode } from '../types.js';
// Import the settings utilities
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
  // const [folders, setFolders] = useState<FolderInfo[]>([]); // Removed: Managed by useFolders in Sidebar
  const [selectedFolder, setSelectedFolder] = useState<string>(() => {
    return getHomeDirectory() || '';
  });
  // const [images, setImages] = useState<ImageInfo[]>([]); // Removed
  const [zoom, setZoom] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // const [currentDirectory, setCurrentDirectory] = useState<string>(''); // Removed: Managed by useCurrentDirectory
  // const [isLoading, setIsLoading] = useState<boolean>(false); // Removed
  // const [error, setError] = useState<string | null>(null); // Removed
  const [isGrouped, setIsGrouped] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);

  // Create ref for the main scrollable element
  const mainScrollRef = useRef<HTMLElement>(null);

  /**
   * Effect hook to fetch the list of folders when the component mounts.
   * Sets the first folder as selected if available.
   * Removed: This is now handled by Sidebar component via useFolders hook.
   */
  // useEffect(() => {
  //   const fetchFolders = async () => {
  //     try {
  //       const folderList = await getFolders();
  //       setFolders(folderList);
  //       if (folderList.length > 0 && !selectedFolder) { // Only set initial folder if none selected
  //         setSelectedFolder(folderList[0].name);
  //       }
  //     } catch (error) {
  //       console.error('Error fetching folders:', error);
  //       // setError('Failed to fetch folders'); // setError removed
  //     }
  //   };

  //   fetchFolders();
  // }, [selectedFolder]);

  /**
   * Effect hook to fetch images when the selected folder changes.
   * Updates loading state and handles errors.
   * Removed: This is now handled by ImageFeed component via useFolderImages hook.
   */
  // ... (Removed image fetching useEffect)

  /**
   * Handler for folder selection change.
   * Updates the selected folder state.
   * @param {string} folder - The newly selected folder.
   */
  const handleFolderChange = (folder: string) => {
    setSelectedFolder(folder);
    // No need to fetch images here manually anymore
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
    <Layout
      // folders={folders} // Removed
      selectedFolder={selectedFolder}
      onFolderChange={handleFolderChange}
      // currentDirectory={selectedFolder} // Removed
      onSearch={handleSearch}
      zoom={zoom}
      onZoomChange={handleZoomChange}
      isGrouped={isGrouped}
      onGroupToggle={handleGroupToggle}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      mainRef={mainScrollRef}
    >
      {/* Pass relevant state down to MainContent */}
      {/* MainContent no longer needs images, isLoading, error */}
      <MainContent
        // images={images} // Removed
        zoom={zoom}
        searchQuery={searchQuery}
        // isLoading={isLoading} // Removed
        // error={error} // Removed
        selectedFolder={selectedFolder}
        isGrouped={isGrouped}
        viewMode={viewMode}
        scrollContainerRef={mainScrollRef}
      />
    </Layout>
  );
};

export default Home;
