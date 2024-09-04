import React from "react";
import { ImageInfo } from "@/types";
import styles from "../styles/ImageStack.module.css";

interface ImageStackProps {
  images: ImageInfo[];
  onImageClick: (image: ImageInfo) => void;
}

const ImageStack: React.FC<ImageStackProps> = ({ images, onImageClick }) => {
  const mainImage = images[0];

  return (
    <div className={styles.imageStack} onClick={() => onImageClick(mainImage)}>
      <img
        src={mainImage.src}
        alt={mainImage.alt}
        className={styles.mainImage}
      />
      {images.length > 1 && (
        <div className={styles.countIndicator}>
          <span>{images.length}</span>
        </div>
      )}
    </div>
  );
};

export default ImageStack;
