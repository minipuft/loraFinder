import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.js';
import Navbar from './Navbar.js';
import MainContent from './MainContent.js';
import { FolderInfo, ImageInfo } from '../types.js';
import { getImages } from '../lib/api.js'; // Assume this function exists to fetch images
import ParticleBackground from "./ParticleBackground.js";
import LottieBackground from './LottieBackground.js';
import { useCustomProperties } from '../hooks/useCustomProperties';

// Define the props interface for the Layout component
interface LayoutProps {
  children: React.ReactNode;
  folders: FolderInfo[];
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  currentDirectory: string;
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isGrouped: boolean;
  onGroupToggle: () => void;
}

// Define the Layout component
const Layout: React.FC<LayoutProps> = ({
  children,
  folders,
  selectedFolder,
  onFolderChange,
  currentDirectory,
  onSearch,
  zoom,
  onZoomChange,
  isGrouped,
  onGroupToggle,
}) => {
  useCustomProperties();

  // State variables for managing images, loading state, error, and search query
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Effect hook to fetch images when the selected folder changes
  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedImages = await getImages(selectedFolder);
        setImages(fetchedImages);
      } catch (err) {
        setError("Failed to fetch images");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [selectedFolder]);

  // Handler for search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  // Handler for when image upload is complete
  const handleUploadComplete = () => {
    // Refetch images after upload
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedImages = await getImages(selectedFolder);
        setImages(fetchedImages);
      } catch (err) {
        setError("Failed to fetch images");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  };

  // Render the layout structure
  return (
    <div className="flex flex-col h-screen relative bg-transparent">
      <div className="gradient-overlay"></div>
      <LottieBackground />
      <ParticleBackground />
      <Navbar
        currentDirectory={currentDirectory}
        onSearch={onSearch}
        zoom={zoom}
        onZoomChange={onZoomChange}
        isGrouped={isGrouped}
        onGroupToggle={onGroupToggle}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onFolderChange={onFolderChange}
        />
        <main className="flex-1 overflow-auto p-4 relative bg-transparent">
          <div className="relative z-10">
            <MainContent
              images={images}
              selectedFolder={selectedFolder}
              searchQuery={searchQuery}
              isLoading={isLoading}
              error={error}
              //onUploadComplete={handleUploadComplete}
              zoom={zoom}
              isGrouped={isGrouped}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;