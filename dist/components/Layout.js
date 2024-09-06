import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Import necessary dependencies and components
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.js';
import Navbar from './Navbar.js';
import MainContent from './MainContent.js';
import { getImages } from '../lib/api.js'; // Assume this function exists to fetch images
// Define the Layout component
const Layout = ({ children, folders, selectedFolder, onFolderChange, currentDirectory, onSearch, zoom, onZoomChange, isGrouped, onGroupToggle, }) => {
    // State variables for managing images, loading state, error, and search query
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    // Effect hook to fetch images when the selected folder changes
    useEffect(() => {
        const fetchImages = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedImages = await getImages(selectedFolder);
                setImages(fetchedImages);
            }
            catch (err) {
                setError('Failed to fetch images');
                console.error(err);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchImages();
    }, [selectedFolder]);
    // Handler for search functionality
    const handleSearch = (query) => {
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
            }
            catch (err) {
                setError('Failed to fetch images');
                console.error(err);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchImages();
    };
    // Render the layout structure
    return (_jsxs("div", { className: "flex flex-col h-screen bg-navy", children: [_jsx(Navbar, { currentDirectory: currentDirectory, onSearch: handleSearch, zoom: zoom, onZoomChange: onZoomChange, isGrouped: isGrouped, onGroupToggle: onGroupToggle }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx(Sidebar, { folders: folders, selectedFolder: selectedFolder, onFolderChange: onFolderChange }), _jsx("main", { className: "flex-1 overflow-auto bg-navy p-4", children: _jsx(MainContent, { images: images, selectedFolder: selectedFolder, searchQuery: searchQuery, isLoading: isLoading, error: error, onUploadComplete: handleUploadComplete, zoom: zoom, isGrouped: isGrouped }) })] })] }));
};
export default Layout;
//# sourceMappingURL=Layout.js.map