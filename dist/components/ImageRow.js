import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect, useState } from "react";
import useWindowSize from "../hooks/useWindowSize.js";
import ImageItem from "./ImageItem.js";
import styles from "../styles/ImageRow.module.scss";
// Define the ImageRow component
const ImageRow = ({ images, onImageClick, columns, zoom, isLastRow, groupedImages, rowHeight, }) => {
    // Create a ref for the row div and a state for its width
    const rowRef = useRef(null);
    const [rowWidth, setRowWidth] = useState(0);
    const { width: windowWidth } = useWindowSize();
    // Effect to update row width when the ref changes
    useEffect(() => {
        if (rowRef.current) {
            setRowWidth(rowRef.current.offsetWidth);
        }
    }, [rowRef.current, windowWidth]);
    // Add a check for images
    if (!images || images.length === 0) {
        return null; // or return a placeholder component
    }
    // Calculate the total aspect ratio of all images in the row
    const totalAspectRatio = images.reduce((sum, img) => sum + img.width / img.height, 0);
    // Calculate the ideal row width
    const idealRowWidth = rowWidth * zoom;
    let imageWidths;
    if (isLastRow && images.length === 1) {
        // For the last row with only one image, set a maximum width
        const maxWidth = idealRowWidth * 0.75; // 75% of the row width
        imageWidths = [Math.min(maxWidth, idealRowWidth)];
    }
    else {
        // Original width distribution logic
        let remainingWidth = idealRowWidth;
        imageWidths = images.map((image, index) => {
            const aspectRatio = image.width / image.height;
            let width = (aspectRatio / totalAspectRatio) * idealRowWidth;
            // Ensure the last image fills the remaining space
            if (index === images.length - 1) {
                width = remainingWidth;
            }
            else {
                remainingWidth -= width;
            }
            return Math.floor(width);
        });
    }
    const containerHeight = isLastRow && images.length < columns
        ? (imageWidths[0] / images[0].width) * images[0].height
        : (imageWidths[0] / images[0].width) * images[0].height;
    return (_jsx("div", { ref: rowRef, className: styles.imageRow, children: images.map((image, index) => {
            const group = groupedImages.find(g => g.images.some(img => img.id === image.id));
            const groupCount = group ? group.images.length : 1;
            return (_jsx("div", { className: styles.imageWrapper, style: { width: imageWidths[index], height: containerHeight }, children: _jsx(ImageItem, { image: image, onClick: () => onImageClick(image, group ? group.images : [image]), containerWidth: imageWidths[index], containerHeight: containerHeight, zoom: zoom, groupCount: groupCount }) }, image.id));
        }) }));
};
export default ImageRow;
//# sourceMappingURL=ImageRow.js.map