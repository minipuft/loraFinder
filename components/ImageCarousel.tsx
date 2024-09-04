import React from "react";
import { ImageInfo } from "@/types";
import Lightbox from "yet-another-react-lightbox";
import Inline from "yet-another-react-lightbox/plugins/inline";
import "yet-another-react-lightbox/styles.css";

interface ImageCarouselProps {
  images: ImageInfo[];
  onClick: () => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  onClick,
  containerWidth,
  containerHeight,
  zoom,
}) => {
  const scaledWidth = containerWidth * zoom;
  const scaledHeight = containerHeight * zoom;

  return (
    <div
      style={{
        width: scaledWidth,
        height: scaledHeight,
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Lightbox
        slides={images.map((img) => ({
          src: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height,
        }))}
        plugins={[Inline]}
        inline={{
          style: { width: "100%", height: "100%" },
        }}
      />
    </div>
  );
};

export default ImageCarousel;
