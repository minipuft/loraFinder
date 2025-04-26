import React from 'react';
import styles from '../styles/ImageItem.module.scss';

interface ImageSkeletonProps {
  containerWidth: number;
  containerHeight: number;
  placeholderColor?: string;
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  containerWidth,
  containerHeight,
  placeholderColor,
}) => {
  const backgroundStyle = placeholderColor ? { backgroundColor: placeholderColor } : {};

  return (
    <div
      className={`${styles.imageItem} ${styles.imageSkeleton}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: `${containerWidth} / ${containerHeight}`,
        ...backgroundStyle,
      }}
    >
      <div className={styles.skeletonAnimation}></div>
    </div>
  );
};

export default ImageSkeleton;
