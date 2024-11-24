import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from "../styles/ImageItem.module.scss";
import { useIntersectionObserver } from '../hooks/useIntersectionObserver.js';
const ImageItem = ({ image, onClick, containerWidth, containerHeight, zoom, groupCount, imageProcessor }) => {
    const [ref, isIntersecting] = useIntersectionObserver({
        threshold: 0.1,
        triggerOnce: true
    });
    const [processedImage, setProcessedImage] = useState(null);
    useEffect(() => {
        if (isIntersecting) {
            imageProcessor.postMessage({
                action: 'processImage',
                imageSrc: image.src,
                width: containerWidth,
                height: containerHeight
            });
            imageProcessor.onmessage = (event) => {
                if (event.data.action === 'imageProcessed') {
                    setProcessedImage(event.data.processedImage);
                }
            };
        }
    }, [isIntersecting, image.src, containerWidth, containerHeight]);
    const clipPathVariants = {
        hidden: { clipPath: 'inset(100% 0 0 0)' },
        visible: {
            clipPath: 'inset(0% 0 0 0)',
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };
    return (_jsxs(motion.div, { ref: ref, className: styles.imageItem, style: {
            width: containerWidth,
            height: containerHeight,
        }, whileHover: { scale: 1.05 }, onClick: () => onClick(image), children: [_jsx(AnimatePresence, { children: isIntersecting ? (_jsx(motion.div, { initial: "hidden", animate: "visible", exit: "hidden", variants: clipPathVariants, children: _jsx(motion.img, { src: processedImage || image.src, alt: image.alt, style: {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }, whileHover: {
                            scale: 1.1,
                            transition: { duration: 0.3 }
                        } }) }, "image")) : (_jsx(motion.div, { className: styles.imageSkeleton, style: {
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#f0f0f0',
                    } }, "skeleton")) }), groupCount && groupCount > 1 && (_jsx(motion.div, { className: styles.groupCounter, initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 }, transition: { delay: 0.2, duration: 0.3 }, children: groupCount }))] }));
};
// Use React.memo to memoize the component
export default memo(ImageItem, (prevProps, nextProps) => {
    // Custom comparison function
    return (prevProps.image.src === nextProps.image.src &&
        prevProps.containerWidth === nextProps.containerWidth &&
        prevProps.containerHeight === nextProps.containerHeight &&
        prevProps.zoom === nextProps.zoom &&
        prevProps.groupCount === nextProps.groupCount);
});
//# sourceMappingURL=ImageItem.js.map