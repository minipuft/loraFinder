import React from "react";
import Image from "next/image";
import { ImageInfo } from "@/types";
import styles from "../styles/ImageItem.module.css";
import { truncateImageTitle } from "../utils/stringUtils";

interface ImageItemProps {
  image: ImageInfo;
  onClick: () => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  groupCount?: number;
}

const ImageItem: React.FC<ImageItemProps> = React.memo(
  ({ image, onClick, containerWidth, containerHeight, zoom, groupCount }) => {
    const scaledWidth = containerWidth * zoom;
    const scaledHeight = containerHeight * zoom;

    return (
      <div
        className={`${styles.imageWrapper} ${styles.smoothTransition}`}
        style={{ width: scaledWidth, height: scaledHeight }}
        onClick={onClick}
      >
        <Image
          src={image.src}
          alt={image.alt}
          layout="fill"
          objectFit="cover"
          className={styles.image}
        />
        <div className={styles.imageOverlay}>
          <div className={styles.imageTitle}>
            <p className="text-sm font-medium truncate">
              {truncateImageTitle(image.alt)}
            </p>
          </div>
        </div>
        {groupCount && groupCount > 1 && (
          <div className={`${styles.groupCounter} ${styles.alwaysVisible}`}>{groupCount}</div>
        )}
      </div>
    );
  }
);

export default ImageItem;
