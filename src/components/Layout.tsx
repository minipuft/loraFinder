import React, { forwardRef, useRef } from 'react';
// Removed ViewMode import, will get from context if needed internally
import NexusOrb from './NexusOrb'; // Import NexusOrb
// import Sidebar from './Sidebar.js'; // Comment out or remove old Sidebar
import { TapestrySidebar } from './TapestrySidebar'; // Import new TapestrySidebar
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
  // navbarRef?: React.Ref<HTMLDivElement>; // NexusOrb doesn't need a ref passed this way currently
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
      // navbarRef, // Removed
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

    // ++ Create a ref for the AuraBackground canvas element ++
    const auraCanvasGlobalRef = useRef<HTMLCanvasElement>(null);

    // Render the layout structure
    return (
      <div ref={ref} className="flex flex-col h-screen relative bg-transparent">
        <ColorProvider>
          <div className="gradient-overlay"></div>
          {/* Pass the ref to AuraBackground */}
          <AuraBackground ref={auraCanvasGlobalRef} />
          {/* <ParticleBackground /> */}
          <NexusOrb /> {/* Replaced Navbar with NexusOrb */}
          <div className="flex flex-1 overflow-hidden">
            {/* Pass the auraCanvasGlobalRef to TapestrySidebar */}
            <TapestrySidebar auraCanvasRef={auraCanvasGlobalRef} />
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
