import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import ImageViewer from './ImageViewer.js';
// MainContent component that renders the primary content area of the application
const MainContent = ({ images, selectedFolder, searchQuery, isLoading, error, zoom, isGrouped, }) => {
    // Memoized filtered images based on the search query
    const filteredImages = useMemo(() => {
        if (!searchQuery)
            return images;
        return images.filter(image => image.alt.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [images, searchQuery]);
    // Render the main content
    return (_jsx(_Fragment, { children: _jsx(ImageViewer, { images: filteredImages, isLoading: isLoading, error: error, selectedFolder: selectedFolder, zoom: zoom, isGrouped: isGrouped }) }));
};
// Export the MainContent component
export default MainContent;
//# sourceMappingURL=MainContent.js.map