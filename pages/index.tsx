import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import MainContent from '../components/MainContent';
import { getFolders, getImages } from '../lib/api';
import { ImageInfo, FolderInfo } from '../types';

/**
 * Home component - the main page of the application.
 * It manages the overall state and layout of the app.
 *
 * @component
 * @returns {JSX.Element} The main application page.
 */
const Home: React.FC = () => {
  // State declarations
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the list of folders when the component mounts.
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
        console.error('Error fetching folders:', error);
        setError('Failed to fetch folders');
      }
    };

    fetchFolders();
  }, []);

  /**
   * Fetches images when the selected folder changes.
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
        console.error('Error fetching images:', error);
        setError('Failed to fetch images');
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [selectedFolder]);

  /**
   * Handles folder selection change.
   * @param {string} folder - The newly selected folder.
   */
  const handleFolderChange = (folder: string) => {
    setSelectedFolder(folder);
  };

  /**
   * Handles zoom level change.
   * @param {number} newZoom - The new zoom level.
   */
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  /**
   * Handles search query change.
   * @param {string} query - The new search query.
   */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
  };

  /**
   * Handles completion of file upload.
   */
  const handleUploadComplete = () => {
    // Refresh the images in the current folder
    getImages(selectedFolder).then(setImages);
  };

  return (
    <Layout
      folders={folders}
      selectedFolder={selectedFolder}
      onFolderChange={handleFolderChange}
      currentDirectory={selectedFolder}
      onSearch={handleSearch}
      zoom={zoom}
      onZoomChange={handleZoomChange}
    >
      <MainContent
        images={images}
        zoom={zoom}
        searchQuery={searchQuery}
        isLoading={isLoading}
        error={error}
        selectedFolder={selectedFolder}
        onUploadComplete={handleUploadComplete}
      />
    </Layout>
  );
};

export default Home;