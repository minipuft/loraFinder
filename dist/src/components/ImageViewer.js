import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import ImageFeed from "./ImageFeed.js";
import styles from "../styles/ImageViewer.module.scss";
// Define the ImageViewer component
const ImageViewer = ({ images, isLoading, error, selectedFolder, isGrouped, zoom, }) => {
    return (
    // Main container with flex layout
    _jsx("div", { className: `${styles.imageViewer} flex flex-col h-full`, children: _jsx("div", { className: `${styles.contentContainer} flex-1`, children: error ? (
            // Display error message if there's an error
            _jsxs("div", { className: "text-center text-accent-red", children: [_jsxs("p", { children: ["Error: ", error] }), _jsx("p", { children: "Please try again later or contact support if the problem persists." })] })) : isLoading ? (
            // Display loading message while images are being fetched
            _jsx("div", { className: "text-center text-gray-300", children: "Loading images..." })) : images.length === 0 ? (
            // Display message when no images are found in the folder
            _jsx("div", { className: "text-center text-gray-300", children: "No images found in this folder." })) : (
            // Render ImageFeed component when images are available
            _jsx(ImageFeed, { images: images, isLoading: isLoading, isGrouped: isGrouped, zoom: zoom })) }) }));
};
// Export the ImageViewer component
export default ImageViewer;
//# sourceMappingURL=ImageViewer.js.map