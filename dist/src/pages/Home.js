import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import Layout from "../components/Layout.js";
import MainContent from "../components/MainContent.js";
import { getFolders, getImages } from "../lib/api.js";
/**
 * Home component - the main page of the application.
 * It manages the overall state and layout of the app.
 *
 * @component
 * @returns {JSX.Element} The main application page.
 */
const Home = () => {
    // State declarations for managing application data and UI
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [images, setImages] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentDirectory, setCurrentDirectory] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isGrouped, setIsGrouped] = useState(true);
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
            }
            catch (error) {
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
            if (!selectedFolder)
                return;
            setIsLoading(true);
            setError(null);
            try {
                const imageList = await getImages(selectedFolder);
                setImages(imageList);
            }
            catch (error) {
                console.error("Error fetching images:", error);
                setError("Failed to fetch images");
                setImages([]);
            }
            finally {
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
    const handleFolderChange = (folder) => {
        setSelectedFolder(folder);
    };
    /**
     * Handler for zoom level change.
     * Updates the zoom state.
     * @param {number} newZoom - The new zoom level.
     */
    const handleZoomChange = (newZoom) => {
        setZoom(newZoom);
    };
    /**
     * Handler for search query change.
     * Updates the search query state.
     * @param {string} query - The new search query.
     */
    const handleSearch = (query) => {
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
    return (_jsx(Layout, { folders: folders, selectedFolder: selectedFolder, onFolderChange: handleFolderChange, currentDirectory: selectedFolder, onSearch: handleSearch, zoom: zoom, onZoomChange: handleZoomChange, isGrouped: isGrouped, onGroupToggle: handleGroupToggle, children: _jsx(MainContent, { images: images, zoom: zoom, searchQuery: searchQuery, isLoading: isLoading, error: error, selectedFolder: selectedFolder, 
            // onUploadComplete={handleUploadComplete}
            isGrouped: isGrouped }) }));
};
export default Home;
//# sourceMappingURL=Home.js.map