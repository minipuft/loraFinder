import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MainContent from './MainContent';
import { FolderInfo, ImageInfo } from '../types';
import { getImages } from '../lib/api'; // Assume this function exists to fetch images

interface LayoutProps {
  folders: FolderInfo[];
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  currentDirectory: string;
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  folders, 
  selectedFolder, 
  onFolderChange,
  currentDirectory,
  onSearch,
  zoom,
  onZoomChange,
}) => {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedImages = await getImages(selectedFolder);
        setImages(fetchedImages);
      } catch (err) {
        setError('Failed to fetch images');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [selectedFolder]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleUploadComplete = () => {
    // Refetch images after upload
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedImages = await getImages(selectedFolder);
        setImages(fetchedImages);
      } catch (err) {
        setError('Failed to fetch images');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  };

  return (
    <div className="flex flex-col h-screen bg-navy">
      <Navbar 
        currentDirectory={currentDirectory}
        onSearch={handleSearch}
        zoom={zoom}
        onZoomChange={onZoomChange}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          folders={folders} 
          selectedFolder={selectedFolder} 
          onFolderChange={onFolderChange}
        />
        <main className="flex-1 overflow-auto bg-navy p-4">
          <MainContent
            images={images}
            selectedFolder={selectedFolder}
            searchQuery={searchQuery}
            isLoading={isLoading}
            error={error}
            onUploadComplete={handleUploadComplete}
          />
        </main>
      </div>
    </div>
  );
};

export default Layout;