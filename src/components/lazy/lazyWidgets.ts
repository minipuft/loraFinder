import { lazy } from 'react';

// Lazy-loaded widget components
export const LazyImageFeed = lazy(() => import('../ImageFeed'));

// Lazy-loaded view components
export const LazyMasonryView = lazy(() => import('../views/MasonryView'));
export const LazyCarouselView = lazy(() => import('../views/CarouselView'));
export const LazyBannerView = lazy(() => import('../views/BannerView'));
