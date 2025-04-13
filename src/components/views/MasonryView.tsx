import React from 'react';
import { ImageInfo } from '../../types';
import Masonry from 'react-masonry-css';
import { motion } from 'framer-motion';

interface MasonryViewProps {
  images: ImageInfo[];
  zoom: number;
}

const MasonryView: React.FC<MasonryViewProps> = ({ images, zoom }) => {
  const breakpointColumns = {
    default: 4,
    1536: 4,
    1280: 3,
    1024: 3,
    768: 2,
    640: 1,
  };

  if (!images.length) {
    return <div className="text-center text-gray-500 mt-8">No images to display</div>;
  }

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="flex -ml-4 w-auto"
      columnClassName="pl-4 bg-clip-padding"
    >
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="mb-4"
        >
          <div className="relative group rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-auto"
              style={{
                maxHeight: `${400 * zoom}px`,
                objectFit: 'cover',
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-white text-lg font-semibold">{image.title}</h3>
              <p className="text-white/80 text-sm">
                {image.width} × {image.height}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </Masonry>
  );
};

export default MasonryView;
