import React from 'react';
import { ImageInfo } from '../../types';
import { motion } from 'framer-motion';

interface BannerViewProps {
  images: ImageInfo[];
  zoom: number;
}

const BannerView: React.FC<BannerViewProps> = ({ images, zoom }) => {
  if (!images.length) {
    return <div className="text-center text-gray-500 mt-8">No images to display</div>;
  }

  return (
    <div className="banner-view space-y-4">
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="banner-item relative"
        >
          <div
            className="banner-image-container w-full h-[300px] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
            style={{ height: `${300 * zoom}px` }}
          >
            <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h3 className="text-white text-lg font-semibold">{image.title}</h3>
              <p className="text-white/80 text-sm">
                {image.width} × {image.height}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default BannerView;
