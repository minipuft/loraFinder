import React from 'react';
import { ImageInfo } from '../../types';
import Slider from 'react-slick';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface CarouselViewProps {
  images: ImageInfo[];
  zoom: number;
}

const NextArrow = (props: any) => {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors duration-300"
    >
      <FaChevronRight />
    </button>
  );
};

const PrevArrow = (props: any) => {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors duration-300"
    >
      <FaChevronLeft />
    </button>
  );
};

const CarouselView: React.FC<CarouselViewProps> = ({ images, zoom }) => {
  if (!images.length) {
    return <div className="text-center text-gray-500 mt-8">No images to display</div>;
  }

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    adaptiveHeight: true,
    customPaging: (i: number) => (
      <div className="w-3 h-3 mx-1 rounded-full bg-white/50 hover:bg-white/70 transition-colors duration-300" />
    ),
  };

  return (
    <div className="carousel-view">
      <Slider {...settings}>
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="outline-none"
          >
            <div className="relative aspect-video">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-contain"
                style={{
                  maxHeight: `${600 * zoom}px`,
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white text-lg font-semibold">{image.title}</h3>
                <p className="text-white/80 text-sm">
                  {image.width} × {image.height}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </Slider>
    </div>
  );
};

export default CarouselView;
