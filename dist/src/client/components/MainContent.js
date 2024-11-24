import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import ImageViewer from "../../client/components/ImageViewer";
import { useImagesQuery } from "../../client/hooks/useApiQueries";
// MainContent component that renders the primary content area of the application
const MainContent = ({ selectedFolder, searchQuery, zoom, isGrouped, }) => {
    const { data: images, isLoading, error } = useImagesQuery(selectedFolder);
    console.log("MainContent rendering", { images, selectedFolder, searchQuery, isLoading, error, zoom, isGrouped });
    if (isLoading) {
        return _jsx("div", { children: "Loading images..." });
    }
    if (error) {
        return _jsxs("div", { children: ["Error loading images: ", error.message] });
    }
    // Memoized filtered images based on the search query
    const filteredImages = useMemo(() => {
        if (!images)
            return [];
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