import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import Layout from "../../client/components/Layout";
import MainContent from "../../client/components/MainContent";
import { getImages } from "../../shared/lib/api";
import { useFoldersQuery } from "../../client/hooks/useApiQueries";
/**
 * Home component - the main page of the application.
 * It manages the overall state and layout of the app.
 *
 * @component
 * @returns {JSX.Element} The main application page.
 */
const Home = ({ webGLSupported }) => {
    const [selectedFolder, setSelectedFolder] = useState("");
    const [images, setImages] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentDirectory, setCurrentDirectory] = useState("");
    const [isGrouped, setIsGrouped] = useState(true);
    const { data: folders, isLoading, error } = useFoldersQuery();
    /**
     * Effect hook to fetch images when the selected folder changes.
     * Updates loading state and handles errors.
     */
    useEffect(() => {
        const fetchImages = async () => {
            if (!selectedFolder) {
                setImages([]);
                return;
            }
            const imageList = await getImages(selectedFolder);
            setImages(imageList);
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
    return (_jsx(Layout, { folders: folders ?? [], selectedFolder: selectedFolder, onFolderChange: handleFolderChange, currentDirectory: currentDirectory, onSearch: handleSearch, zoom: zoom, onZoomChange: handleZoomChange, isGrouped: isGrouped, onGroupToggle: handleGroupToggle, children: _jsx(MainContent, { images: images, selectedFolder: selectedFolder, searchQuery: searchQuery, isLoading: isLoading, error: error?.message ?? null, zoom: zoom, isGrouped: isGrouped }) }));
};
export default Home;
//# sourceMappingURL=Home.js.map