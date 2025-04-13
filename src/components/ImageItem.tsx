import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import gsap from 'gsap';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver.js';
import styles from '../styles/ImageItem.module.scss';
import { ImageInfo } from '../types.js';
import AnimationSystem from '../utils/AnimationSystem';
import { maintainAspectRatio } from '../utils/layoutCalculator';
import { truncateImageTitle } from '../utils/stringUtils.js';

interface ImageItemProps {
  image: ImageInfo;
  onClick: (image: ImageInfo) => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  groupCount?: number;
  imageProcessor: any;
  onResize?: (width: number, height: number) => void;
  width: number;
  height: number;
  isCarousel: boolean;
  groupImages: ImageInfo[];
  processedImage?: {
    low: string;
    high: string;
  };
}

const ImageItem: React.FC<ImageItemProps> = ({
  image,
  onClick,
  containerWidth,
  containerHeight,
  zoom = 1,
  groupCount,
  imageProcessor,
  onResize,
  width,
  height,
  isCarousel = false,
  groupImages = [],
  processedImage,
}) => {
  const controls = useAnimation();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState(processedImage?.low || image.src);
  const animationSystem = useMemo(() => AnimationSystem.getInstance(), []);

  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0,
    rootMargin: '100px',
    triggerOnce: true,
  });

  // Memoized dimensions calculation
  const dimensions = useMemo(
    () => maintainAspectRatio(image, containerWidth, containerHeight),
    [image, containerWidth, containerHeight]
  );

  // Notify parent of size changes using cached dimensions
  useEffect(() => {
    if (onResize) {
      onResize(dimensions.width, dimensions.height);
    }
  }, [dimensions.width, dimensions.height, onResize]);

  // Optimized hover animation
  const handleHoverStart = useCallback(() => {
    setIsHovered(true);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, []);

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, []);

  // Enhanced zoom animation
  useEffect(() => {
    if (!containerRef.current) return;

    const animation = gsap.to(containerRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      ...animationSystem.getAnimationProperties(image.id),
      onComplete: () => {
        if (containerRef.current) {
          containerRef.current.style.willChange = 'auto';
          animationSystem.createMorphAnimation(containerRef.current, image.id);
        }
      },
    });

    return () => {
      animation.kill();
    };
  }, [dimensions.width, dimensions.height, zoom, image.id, animationSystem]);

  // Process image when in view
  useEffect(() => {
    if (isIntersecting && imageProcessor && !processedImage?.high) {
      imageProcessor.postMessage({
        action: 'processImage',
        imageSrc: image.src,
        width: Math.ceil(dimensions.width),
        height: Math.ceil(dimensions.height),
      });
    }
  }, [
    isIntersecting,
    image.src,
    dimensions.width,
    dimensions.height,
    imageProcessor,
    processedImage,
  ]);

  // Update image source
  useEffect(() => {
    if (processedImage?.high && isLoaded) {
      setCurrentImage(processedImage.high);
    }
  }, [processedImage, isLoaded]);

  // Mount animation
  useEffect(() => {
    if (!containerRef.current) return;

    const animation = gsap.fromTo(
      containerRef.current,
      {
        opacity: 0,
        scale: 0.95,
      },
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
      }
    );

    return () => {
      animation.kill();
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`${styles.imageContainer} group`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={() => {
        onClick(image);
      }}
    >
      <motion.div
        className={styles.imageWrapper}
        layout
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <motion.img
          ref={imageRef}
          src={currentImage}
          alt={image.alt}
          className={styles.image}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          layoutId={`image-${image.id}`}
          onLoad={() => setIsLoaded(true)}
          initial={{ opacity: 0 }}
          animate={{
            opacity: isLoaded ? 1 : 0,
            scale: isLoaded ? 1 : 0.95,
          }}
          transition={{
            duration: 0.3,
            ease: 'easeOut',
          }}
        />

        <AnimatePresence>
          {groupCount && groupCount > 1 && (
            <motion.div
              className={styles.groupCounter}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {groupCount}
            </motion.div>
          )}
        </AnimatePresence>

        {isCarousel && groupImages.length > 1 && (
          <div className={styles.carouselIndicator}>{groupImages.length}</div>
        )}

        <motion.div
          className={styles.imageTitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 20,
          }}
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}
        >
          {truncateImageTitle(image.alt)}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default memo(ImageItem);
