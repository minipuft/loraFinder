import React from 'react';
import { ImageInfo } from '@/types';
import styles from '../styles/GroupedImageItem.module.css';

interface GroupedImageItemProps {
  group: {
    key: string;
    images: ImageInfo[];
    isCarousel: boolean;
  };
  onClick: () => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
}

const GroupedImageItem: React.FC<GroupedImageItemProps> = ({
  group,
  onClick,
  containerWidth,
  containerHeight,
  zoom,
}) => {
  const representativeImage = group.images[0];

  return (
    <div
      className={styles.groupedImageWrapper}
      style={{
        width: containerWidth * zoom,
        height: containerHeight * zoom,
      }}
      onClick={onClick}
    >
      <img
        src={representativeImage.src}
        alt={representativeImage.alt}
        className={styles.image}
      />
      {group.images.length > 1 && (
        <div className={styles.groupIndicator}>
          +{group.images.length - 1}
        </div>
      )}
    </div>
  );
};

export default GroupedImageItem;
