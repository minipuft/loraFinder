import React from 'react';
import { imageResource } from '../../utils/imageResource';

// Define valid HTML img attributes, excluding src potentially
interface SuspenseImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string; // Ensure src is required
}

const SuspenseImage: React.FC<SuspenseImageProps> = ({
  src,
  alt,
  ...rest // Spread remaining props like className, style, width, height, etc.
}) => {
  // Attempt to read the image from the resource cache.
  // This will throw the promise if the image is not loaded yet, triggering Suspense.
  imageResource.read(src);

  // If imageResource.read() doesn't throw, the image is loaded.
  // Render the actual img tag.
  return <img src={src} alt={alt ?? ''} {...rest} />;
};

export default SuspenseImage;
