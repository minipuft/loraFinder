import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ImageInfo } from '@/types';
import ImageSkeleton from './ImageSkeleton';
import Lightbox from 'yet-another-react-lightbox';
import "yet-another-react-lightbox/styles.css";
import styles from '../styles/ImageFeed.module.css';
import ImageRow from './ImageRow';

interface ImageFeedProps {
  images: ImageInfo[];
  isLoading: boolean;
}

const ImageFeed: React.FC<ImageFeedProps> = ({ images, isLoading }) => {
  const [displayedImages, setDisplayedImages] = useState<ImageInfo[]>(images.slice(0, 20));
  const [hasMore, setHasMore] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [columns, setColumns] = useState(4);

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const loadMore = useCallback(() => {
    const newImages = images.slice(displayedImages.length, displayedImages.length + 20);
    setDisplayedImages(prevImages => [...prevImages, ...newImages]);
    if (displayedImages.length + newImages.length >= images.length) {
      setHasMore(false);
    }
  }, [images, displayedImages]);

  const groupImages = useCallback((images: ImageInfo[], columnCount: number) => {
    const groups: ImageInfo[][] = [];
    let currentGroup: ImageInfo[] = [];
    let currentAspectRatioSum = 0;
    const targetAspectRatioSum = columnCount * (16 / 9); // Adjust this ratio as needed

    images.forEach((image) => {
      const imageAspectRatio = image.width / image.height;
      if (currentAspectRatioSum + imageAspectRatio > targetAspectRatioSum && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentAspectRatioSum = 0;
      }
      currentGroup.push(image);
      currentAspectRatioSum += imageAspectRatio;
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }, []);

  const getImageUrl = useCallback((imagePath: string) => {
    const cleanPath = imagePath.replace(/^(\/|api\/image\/)+/, '').replace(/\\/g, '/');
    return `/api/image/${cleanPath}`;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let newColumns: number;
      if (width <= 640) newColumns = 1;
      else if (width <= 1024) newColumns = 2;
      else if (width <= 1280) newColumns = 3;
      else if (width <= 1920) newColumns = 4;
      else if (width <= 2560) newColumns = 5;
      else newColumns = 6;

      setColumns(newColumns);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Add a transition class to the Layout component
    document.querySelector('.react-masonry-list')?.classList.add(styles.smoothTransition);

    // Remove the transition class after the transition is complete
    const transitionTimeout = setTimeout(() => {
      document.querySelector('.react-masonry-list')?.classList.remove(styles.smoothTransition);
    }, 300); // Adjust this value to match your transition duration

    return () => clearTimeout(transitionTimeout);
  }, [displayedImages, columns]);

  const groupedImages = useMemo(() => groupImages(displayedImages, columns), [displayedImages, columns, groupImages]);

  return (
    <div className={styles.imageGrid} style={{ '--columns': columns } as React.CSSProperties}>
      {groupedImages.map((group, groupIndex) => (
        <ImageRow
          key={groupIndex}
          images={group}
          onImageClick={(imageIndex) => handleImageClick(groupedImages.slice(0, groupIndex).flat().length + imageIndex)}
          columns={columns}
        />
      ))}
      {isLoading && <ImageSkeleton />}
      <Lightbox
        slides={images.map(img => ({ src: getImageUrl(img.src), alt: img.alt }))}
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
      />
    </div>
  );
};

export default ImageFeed;