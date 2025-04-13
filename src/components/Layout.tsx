import React, { useState } from 'react';
import { ViewMode } from '../types.js';
import MainContent from './MainContent.js';
import Navbar from './Navbar.js';
import Sidebar from './Sidebar.js';
// import { getImages } from '../lib/api.js'; // Removed: Data fetching moved to hooks/ImageFeed
import { useCustomProperties } from '../hooks/useCustomProperties';
import LottieBackground from './LottieBackground.js';
import ParticleBackground from './ParticleBackground.js';

// Define the props interface for the Layout component
interface LayoutProps {
  children: React.ReactNode;
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isGrouped: boolean;
  onGroupToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Define the Layout component
const Layout: React.FC<LayoutProps> = ({
  children,
  selectedFolder,
  onFolderChange,
  onSearch,
  zoom,
  onZoomChange,
  isGrouped,
  onGroupToggle,
  viewMode,
  onViewModeChange,
}) => {
  useCustomProperties();

  // State variables for managing images, loading state, error, and search query
  // const [images, setImages] = useState<ImageInfo[]>([]); // Removed: Managed by react-query in ImageFeed
  // const [isLoading, setIsLoading] = useState(false); // Removed
  // const [error, setError] = useState<string | null>(null); // Removed
  const [searchQuery, setSearchQuery] = useState(''); // Kept for now, search logic needs update

  // Effect hook to fetch images when the selected folder changes
  // useEffect(() => {
  //   const fetchImages = async () => {
  //     setIsLoading(true);
  //     setError(null);
  //     try {
  //       const fetchedImages = await getImages(selectedFolder);
  //       setImages(fetchedImages || []); // Ensure we always set an array
  //     } catch (err: any) {
  //       const errorMessage = err.message || 'Failed to fetch images';
  //       setError(errorMessage);
  //       setImages([]); // Set empty array on error
  //       console.error('Error fetching images:', err);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   if (selectedFolder) {
  //     fetchImages();
  //   } else {
  //     setImages([]);
  //     setError('No folder selected');
  //   }
  // }, [selectedFolder]); // Removed: Data fetching moved to hooks/ImageFeed

  // Handler for search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query); // Propagate search up if needed
  };

  // Handler for when image upload is complete
  // const handleUploadComplete = () => {
  //   // Refetch images after upload
  //   // This logic needs to be replaced with query invalidation
  //   // e.g., using queryClient.invalidateQueries(['images', selectedFolder]);
  //   const fetchImages = async () => {
  //     setIsLoading(true);
  //     setError(null);
  //     try {
  //       const fetchedImages = await getImages(selectedFolder);
  //       setImages(fetchedImages);
  //     } catch (err) {
  //       setError('Failed to fetch images');
  //       console.error(err);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   fetchImages();
  // }; // Removed: Needs replacement with react-query invalidation

  // Render the layout structure
  return (
    <div className="flex flex-col h-screen relative bg-transparent">
      <div className="gradient-overlay"></div>
      <LottieBackground />
      <ParticleBackground />
      <Navbar
        onSearch={handleSearch} // Use internal handleSearch
        zoom={zoom}
        onZoomChange={onZoomChange}
        isGrouped={isGrouped}
        onGroupToggle={onGroupToggle}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar selectedFolder={selectedFolder} onFolderChange={onFolderChange} />
        <main className="flex-1 overflow-auto p-4 relative bg-transparent">
          <div className="relative z-10">
            <MainContent
              // images={images} // Removed
              selectedFolder={selectedFolder}
              searchQuery={searchQuery} // Still passing search query down
              // isLoading={isLoading} // Removed
              // error={error} // Removed
              zoom={zoom}
              isGrouped={isGrouped}
              viewMode={viewMode}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
