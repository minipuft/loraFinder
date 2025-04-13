import React from 'react';
import styles from '../styles/ImageItem.module.scss';

interface ImageSkeletonProps {
  containerWidth: number;
  containerHeight: number;
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ containerWidth, containerHeight }) => {
  return (
    <div
      className={`${styles.imageItem} ${styles.imageSkeleton}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: `${containerWidth} / ${containerHeight}`,
      }}
    >
      <div className={styles.skeletonAnimation}></div>
    </div>
  );
};

export default ImageSkeleton;
