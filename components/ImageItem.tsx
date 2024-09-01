import React from 'react';
import Image from 'next/image';
import { ImageInfo } from '@/types';
import styles from '../styles/ImageFeed.module.css';

interface ImageItemProps {
  image: ImageInfo;
  onClick: () => void;
  containerWidth: number;
}

const ImageItem: React.FC<ImageItemProps> = React.memo(({ image, onClick, containerWidth }) => {
  const aspectRatio = image.width / image.height;
  
  // Calculate the height based on the container width and aspect ratio
  const height = containerWidth / aspectRatio;

  return (
    <div 
      className={styles.imageWrapper} 
      style={{ width: `${containerWidth}px`, height: `${height}px` }}
      onClick={onClick}
    >
      <Image
        src={image.src}
        alt={image.alt}
        layout="fill"
        objectFit="cover"
        className={styles.image}
      />
      <div className={styles.imageTitle}>
        <p className="text-sm font-medium truncate">{image.alt}</p>
      </div>
    </div>
  );
});

export default ImageItem;
