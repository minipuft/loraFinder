import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import useWindowSize from "../../client/hooks/useWindowSize";
import ImageItem from "../../client/components/ImageItem";
import styles from "../../client/styles/ImageRow.module.scss";
import { motion } from "framer-motion";
// Modify the component to use forwardRef
const ImageRow = forwardRef((props, ref) => {
    const { images, onImageClick, columns, zoom, isLastRow, groupedImages, rowHeight, processedImages, imageProcessor, isVisible, isIntersecting, intersectionRef, layout, containerWidth, } = props;
    const rowRef = useRef(null);
    // Implement useImperativeHandle
    useImperativeHandle(ref, () => ({
        getNode: () => rowRef.current,
    }));
    // Create a ref for the row div and a state for its width
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
    const imageWidths = images.map((image, index) => {
        const aspectRatio = image.width / image.height;
        return (aspectRatio / totalAspectRatio) * idealRowWidth;
    });
    const containerHeight = isLastRow && images.length < columns
        ? (imageWidths[0] / images[0].width) * images[0].height
        : (imageWidths[0] / images[0].width) * images[0].height;
    const rowVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };
    const imageVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: 'spring',
                damping: 15,
                stiffness: 100,
            },
        },
    };
    if (!isVisible) {
        return _jsx("div", { style: { height: containerHeight } });
    }
    if (!isVisible || !isIntersecting) {
        return _jsx("div", { ref: intersectionRef, style: { height: containerHeight } });
    }
    const safeHeight = isNaN(containerHeight) || containerHeight <= 0
        ? `${rowHeight}px`
        : `${containerHeight}px`;
    return (_jsx(motion.div, { ref: rowRef, className: styles.imageRow, variants: rowVariants, initial: "hidden", animate: "visible", style: {
            height: safeHeight,
            transform: `translateY(${layout[0]?.y ?? 0}px)`
        }, children: images.map((image, index) => {
            const group = groupedImages.find(g => g.images.some(img => img.id === image.id));
            const groupCount = group ? group.images.length : 1;
            return (_jsx(motion.div, { className: styles.imageWrapper, style: {
                    width: `${(imageWidths[index] / idealRowWidth) * 100}%`,
                    height: containerHeight,
                }, variants: imageVariants, "data-image-id": image.id, children: _jsx(ImageItem, { image: image, onClick: () => onImageClick(image, group ? group.images : [image]), containerWidth: imageWidths[index], containerHeight: containerHeight, zoom: zoom, groupCount: groupCount, imageProcessor: imageProcessor }) }, image.id));
        }) }));
});
export default ImageRow;
//# sourceMappingURL=ImageRow.js.map