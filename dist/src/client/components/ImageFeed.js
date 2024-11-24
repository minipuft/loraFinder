import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo, useRef, } from "react";
import ImageSkeleton from "../../client/components/ImageSkeleton";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import styles from "../../client/styles/ImageFeed.module.scss";
import ImageRow from "../../client/components/ImageRow";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { truncateImageTitle } from "../../shared/utils/stringUtils";
import { motion, useViewportScroll, useTransform } from "framer-motion";
// import Lottie from 'react-lottie';
import { createImageProcessor } from "../../client/workers/imageProcessor";
import ChunkObserver from "../../client/components/ChunkObserver";
import { v4 as uuidv4 } from "uuid";
// Define the ImageFeed component
const ImageFeed = ({ images, isLoading, isGrouped, zoom, }) => {
    // State for managing displayed images, pagination, lightbox, and columns
    const [displayedImages, setDisplayedImages] = useState(images.slice(0, 20));
    const [hasMore, setHasMore] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [columns, setColumns] = useState(4);
    const [lightboxImages, setLightboxImages] = useState([]);
    const [rowTransforms, setRowTransforms] = useState([]);
    const feedRef = useRef(null);
    const { scrollY } = useViewportScroll();
    const y1 = useTransform(scrollY, [0, 300], [0, 200]);
    const y2 = useTransform(scrollY, [0, 300], [0, -200]);
    const [processedImages, setProcessedImages] = useState({});
    const [visibleChunks, setVisibleChunks] = useState([]);
    const chunkSize = 20; // Adjust this value based on your needs
    const [visibleImages, setVisibleImages] = useState(new Set());
    const [containerWidth, setContainerWidth] = useState(0);
    console.log("ImageFeed rendering with images:", images.length);
    // Group images by similar titles
    const groupedImages = useMemo(() => {
        if (!isGrouped) {
            return images.map((image) => ({
                key: image.id,
                images: [image],
                isCarousel: false,
            }));
        }
        const groups = {};
        images.forEach((image) => {
            const processedTitle = truncateImageTitle(image.alt);
            if (!groups[processedTitle]) {
                groups[processedTitle] = [];
            }
            groups[processedTitle].push(image);
        });
        console.log("groupedImages updated:", groups.length);
        return Object.entries(groups).map(([key, group]) => ({
            key,
            images: group,
            isCarousel: group.length > 1,
        }));
    }, [images, isGrouped]);
    // Calculate rows with grouped images
    const groupedRows = useMemo(() => {
        const rows = [];
        let currentRow = [];
        let currentAspectRatio = 0;
        groupedImages.forEach((group) => {
            const representativeImage = group.images[0];
            const aspectRatio = representativeImage.width / representativeImage.height;
            if (currentAspectRatio + aspectRatio > columns && currentRow.length > 0) {
                rows.push(currentRow);
                currentRow = [];
                currentAspectRatio = 0;
            }
            currentRow.push(representativeImage);
            currentAspectRatio += aspectRatio;
        });
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }
        // Chunk the rows
        const chunkedRows = [];
        for (let i = 0; i < rows.length; i += chunkSize) {
            chunkedRows.push(rows.slice(i, i + chunkSize));
        }
        // If there are no chunks, create one with all available rows
        if (chunkedRows.length === 0 && rows.length > 0) {
            chunkedRows.push(rows);
        }
        console.log("groupedRows updated:", chunkedRows.length);
        return chunkedRows;
    }, [images, groupedImages, columns, chunkSize]);
    // Update handleImageClick to work with grouped images and set lightbox plugins
    const handleImageClick = useCallback((clickedImage) => {
        const groupIndex = groupedImages.findIndex((group) => group.images.some((img) => img.id === clickedImage.id));
        if (groupIndex !== -1) {
            const group = groupedImages[groupIndex];
            setLightboxIndex(groupIndex);
            setLightboxImages(group.images);
        }
    }, [groupedImages, images]);
    // Callback function to load more images
    const loadMore = useCallback(() => {
        const newImages = images.slice(displayedImages.length, displayedImages.length + 20);
        setDisplayedImages((prevImages) => [...prevImages, ...newImages]);
        if (displayedImages.length + newImages.length >= images.length) {
            setHasMore(false);
        }
    }, [images, displayedImages]);
    // Callback function to get the correct image URL
    const getImageUrl = useCallback((imagePath) => {
        const cleanPath = imagePath
            .replace(/^(\/|api\/image\/)+/, "")
            .replace(/\\/g, "/");
        return `/api/images/${cleanPath}`;
    }, []);
    // Function to calculate the number of columns based on container width
    const calculateColumns = (containerWidth) => {
        if (containerWidth >= 2560)
            return 7;
        if (containerWidth >= 1920)
            return 6;
        if (containerWidth >= 1440)
            return 5;
        if (containerWidth >= 1200)
            return 4;
        if (containerWidth >= 992)
            return 3;
        if (containerWidth >= 576)
            return 2;
        return 1;
    };
    // Effect hook to handle window resize and update columns
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const newColumns = calculateColumns(width);
            setColumns(newColumns);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    // Effect hook to handle scroll events and update row transforms
    useEffect(() => {
        const handleScroll = () => {
            const feed = feedRef.current;
            if (!feed)
                return;
            const scrollTop = feed.scrollTop;
            const feedHeight = feed.clientHeight;
            const scrollHeight = feed.scrollHeight;
            const newRowTransforms = groupedRows.map((_, index) => {
                const row = feed.querySelector(`.image-row:nth-child(${index + 1})`);
                if (!row)
                    return 0;
                const rowTop = row.offsetTop;
                const rowHeight = row.clientHeight;
                const scrollPercentage = (scrollTop - rowTop) / (scrollHeight - feedHeight);
                const transform = scrollPercentage * (feedHeight - rowHeight);
                return transform;
            });
            setRowTransforms(newRowTransforms);
        };
        const feed = feedRef.current;
        if (feed) {
            feed.addEventListener("scroll", handleScroll);
        }
        return () => {
            if (feed) {
                feed.removeEventListener("scroll", handleScroll);
            }
        };
    }, [groupedRows]);
    // Effect hook to handle scroll events and update row transforms with 3D effects
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const rows = feedRef.current?.querySelectorAll(".image-row");
            rows?.forEach((row, index) => {
                const speed = 1 + (index % 3) * 0.1; // Vary speed for each row
                const yOffset = scrollY * speed;
                const rotation = Math.sin(scrollY * 0.002 + index) * 5; // Subtle rotation
                row.animate([
                    {
                        transform: `translateY(${yOffset}px) rotateX(${rotation}deg) translateZ(${-index * 10}px)`,
                    },
                ], {
                    duration: 1000,
                    fill: "forwards",
                    easing: "ease-out",
                });
            });
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    // Effect hook to handle scroll events and update row transforms with parallax effect
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "0px",
            threshold: 0.1,
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(styles.visible);
                }
                else {
                    entry.target.classList.remove(styles.visible);
                }
            });
        }, observerOptions);
        document.querySelectorAll(`.${styles.imageWrapper}`).forEach((img) => {
            observer.observe(img);
        });
        return () => observer.disconnect();
    }, []);
    const imageProcessor = useMemo(() => createImageProcessor(), []);
    const intersectionRef = useRef(null);
    const [isIntersecting, setIsIntersecting] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
        }, { threshold: 0.1 });
        if (intersectionRef.current) {
            observer.observe(intersectionRef.current);
        }
        return () => {
            if (intersectionRef.current) {
                observer.unobserve(intersectionRef.current);
            }
        };
    }, []);
    const handleIntersection = useCallback(() => {
        if (isIntersecting && intersectionRef.current) {
            const imageId = intersectionRef.current.getAttribute("data-image-id");
            if (imageId) {
                setVisibleImages((prev) => new Set(prev).add(imageId));
            }
        }
    }, [isIntersecting, intersectionRef]);
    useEffect(() => {
        handleIntersection();
    }, [handleIntersection]);
    useEffect(() => {
        if (feedRef.current) {
            setContainerWidth(feedRef.current.clientWidth);
        }
    }, []);
    return (_jsxs("div", { className: "image-feed overflow-x-hidden", ref: feedRef, style: { perspective: "1000px" }, children: [_jsx(motion.div, { className: styles.parallaxLayer, style: { y: y1 } }), groupedRows.map((chunk, chunkIndex) => (_jsx(ChunkObserver, { chunkIndex: chunkIndex, setVisibleChunks: setVisibleChunks, children: chunk.map((row, rowIndex) => (_jsx(ImageRow, { images: row, onImageClick: handleImageClick, columns: columns, zoom: zoom, isLastRow: rowIndex === groupedRows.length - 1, groupedImages: groupedImages, rowHeight: 200, processedImages: processedImages, imageProcessor: imageProcessor, isVisible: visibleChunks.includes(Math.floor(rowIndex / chunkSize)), isIntersecting: isIntersecting, intersectionRef: intersectionRef, layout: [
                        {
                            id: uuidv4(),
                            x: 0,
                            y: rowTransforms[chunkIndex * chunkSize + rowIndex] || 0,
                            width: containerWidth,
                            height: 200,
                        },
                    ], containerWidth: containerWidth }, `${chunkIndex}-${rowIndex}`))) }, chunkIndex))), isLoading && (_jsx(ImageSkeleton, { containerWidth: 800, containerHeight: 600 })), _jsx(Lightbox, { slides: lightboxImages.map((image) => ({
                    src: image.src,
                    alt: image.alt,
                    title: truncateImageTitle(image.alt),
                    description: `Image ${image.id}`,
                })), open: lightboxIndex >= 0, index: lightboxIndex, close: () => setLightboxIndex(-1), plugins: [
                    Captions,
                    Counter,
                    Zoom,
                    ...(lightboxImages.length > 1 ? [Thumbnails] : []),
                ], thumbnails: {
                    position: "bottom",
                    width: 120,
                    height: 80,
                    border: 1,
                    borderRadius: 4,
                    padding: 4,
                    gap: 16,
                }, animation: {
                    fade: 300,
                    swipe: 300,
                }, carousel: {
                    finite: true,
                    preload: 2,
                } }), _jsx(motion.div, { className: styles.parallaxLayer, style: { y: y2 } })] }));
};
export default ImageFeed;
//# sourceMappingURL=ImageFeed.js.map