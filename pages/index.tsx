import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import MainContent from "../components/MainContent";
import { getFolders, getImages } from "../lib/api";
import { ImageInfo, FolderInfo } from "../types";

/**
 * Home component - the main page of the application.
 * It manages the overall state and layout of the app.
 *
 * @component
 * @returns {JSX.Element} The main application page.
 */
const Home: React.FC = () => {
  // State declarations for managing application data and UI
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentDirectory, setCurrentDirectory] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState<boolean>(true);

  /**
   * Effect hook to fetch the list of folders when the component mounts.
   * Sets the first folder as selected if available.
   */
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const folderList = await getFolders();
        setFolders(folderList);
        if (folderList.length > 0) {
          setSelectedFolder(folderList[0].name);
        }
      } catch (error) {
        console.error("Error fetching folders:", error);
        setError("Failed to fetch folders");
      }
    };

    fetchFolders();
  }, []);

  /**
   * Effect hook to fetch images when the selected folder changes.
   * Updates loading state and handles errors.
   */
  useEffect(() => {
    const fetchImages = async () => {
      if (!selectedFolder) return;

      setIsLoading(true);
      setError(null);

      try {
        const imageList = await getImages(selectedFolder);
        setImages(imageList);
      } catch (error) {
        console.error("Error fetching images:", error);
        setError("Failed to fetch images");
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [selectedFolder]);

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
    // TODO: Implement search functionality
  };

  /**
   * Handler for file upload completion.
   * Refreshes the images in the current folder.
   */
  const handleUploadComplete = () => {
    // Refresh the images in the current folder
    getImages(selectedFolder).then(setImages);
  };

  /**
   * Handler for grouping toggle.
   * Toggles the grouping state.
   */
  const handleGroupToggle = () => {
    setIsGrouped(prevState => !prevState);
  };

  // Render the main layout with all necessary props
  return (
    <Layout
      folders={folders}
      selectedFolder={selectedFolder}
      onFolderChange={handleFolderChange}
      currentDirectory={selectedFolder}
      onSearch={handleSearch}
      zoom={zoom}
      onZoomChange={handleZoomChange}
      isGrouped={isGrouped}
      onGroupToggle={handleGroupToggle}
    >
      <MainContent
        images={images}
        zoom={zoom}
        searchQuery={searchQuery}
        isLoading={isLoading}
        error={error}
        selectedFolder={selectedFolder}
        onUploadComplete={handleUploadComplete}
        isGrouped={isGrouped}
      />
    </Layout>
  );
};

export default Home;
