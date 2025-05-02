import { lazy } from 'react';

// Lazy-loaded widget components
export const LazyImageFeed = lazy(() => import('../components/ImageFeed'));

// Lazy-loaded view components
export const LazyMasonryView = lazy(() => import('../components/views/MasonryView'));
export const LazyCarouselView = lazy(() => import('../components/views/CarouselView'));
export const LazyBannerView = lazy(() => import('../components/views/BannerView'));
