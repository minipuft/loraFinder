import React, { forwardRef } from 'react';
// Removed ViewMode import, will get from context if needed internally
import Navbar from './Navbar.js';
import Sidebar from './Sidebar.js';
// import { getImages } from '../lib/api.js'; // Removed: Data fetching moved to hooks/ImageFeed
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ColorProvider } from '../contexts/ColorContext';
import { useCustomProperties } from '../hooks/useCustomProperties';
// Import the new AuraBackground
// import { AnimationPipeline } from '../animations/AnimationPipeline';
import AuraBackground from './AuraBackground.js';
// Remove ParticleBackground import
// import ParticleBackground from './ParticleBackground.js';

gsap.registerPlugin(ScrollToPlugin);

// Define the props interface for the Layout component
interface LayoutProps {
  // Remove props managed by context
  mainContentSlot: React.ReactNode;
  // Keep refs
  mainRef: React.RefObject<HTMLElement>;
  navbarRef?: React.Ref<HTMLDivElement>;
  sidebarRef?: React.Ref<HTMLDivElement>;
  contentAreaRef?: React.Ref<HTMLDivElement>;
}

// Define the Layout component
const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  (
    {
      // Destructure only remaining props
      mainContentSlot,
      mainRef,
      navbarRef,
      sidebarRef,
      contentAreaRef,
    },
    ref
  ) => {
    // No need to use context directly in Layout if it only passes things down
    // Children (Navbar, Sidebar) will consume the context
    useCustomProperties();

    // State variables for managing images, loading state, error, and search query
    // const [images, setImages] = useState<ImageInfo[]>([]); // Removed: Managed by react-query in ImageFeed
    // const [isLoading, setIsLoading] = useState(false); // Removed
    // const [error, setError] = useState<string | null>(null); // Removed
    // const [searchQuery, setSearchQuery] = useState(''); // Kept for now, search logic needs update

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
    // const handleSearch = (query: string) => {
    //   // setSearchQuery(query);
    //   onSearch(query); // Propagate search up if needed
    // };

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
      <div ref={ref} className="flex flex-col h-screen relative bg-transparent">
        <ColorProvider>
          <div className="gradient-overlay"></div>
          {/* Use AuraBackground instead of ParticleBackground */}
          <AuraBackground />
          {/* <ParticleBackground /> */}
          <Navbar
            ref={navbarRef}
            // Remove props now provided by context
            // onSearch={handleSearch}
            // zoom={zoom}
            // onZoomChange={onZoomChange}
            // isGrouped={isGrouped}
            // onGroupToggle={onGroupToggle}
            // viewMode={viewMode}
            // onViewModeChange={onViewModeChange}
          />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              ref={sidebarRef}
              // Remove props now provided by context
              // selectedFolder={selectedFolder}
              // onFolderChange={onFolderChange}
            />
            <main ref={mainRef} className="flex-1 overflow-auto p-4 relative bg-transparent">
              {contentAreaRef ? (
                <div ref={contentAreaRef} className="relative z-10">
                  {mainContentSlot}
                </div>
              ) : (
                <div className="relative z-10">{mainContentSlot}</div>
              )}
            </main>
          </div>
        </ColorProvider>
      </div>
    );
  }
);

Layout.displayName = 'Layout';

export default Layout;
