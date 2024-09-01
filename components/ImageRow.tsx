import React, { useRef, useEffect, useState } from 'react';
import { ImageInfo } from '@/types';
import ImageItem from './ImageItem';
import styles from '../styles/ImageRow.module.css';

interface ImageRowProps {
  images: ImageInfo[];
  onImageClick: (index: number) => void;
  columns: number;
}

const ImageRow: React.FC<ImageRowProps> = ({ images, onImageClick, columns }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    if (rowRef.current) {
      setRowWidth(rowRef.current.offsetWidth);
    }
  }, []);

  const totalAspectRatio = images.reduce((sum, img) => sum + img.width / img.height, 0);

  return (
    <div ref={rowRef} className={styles.imageRow}>
      {images.map((image, index) => {
        const aspectRatio = image.width / image.height;
        const containerWidth = (aspectRatio / totalAspectRatio) * rowWidth;
        return (
          <ImageItem
            key={image.id}
            image={image}
            onClick={() => onImageClick(index)}
            containerWidth={containerWidth}
          />
        );
      })}
    </div>
  );
};

export default ImageRow;
