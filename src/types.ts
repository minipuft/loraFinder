// Update ImageInfo to match the definition in src/types/index.ts
export interface ImageInfo {
  id: string;
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  group?: {
    key: string;
    images: ImageInfo[];
    isCarousel: boolean;
  };
}

// Keep FolderInfo as is
export interface FolderInfo {
  name: string; // Name of the folder
  path: string; // Path to the folder
}

// You can keep GroupedImageInfo if it's still needed
export interface GroupedImageInfo {
  id: string;
  title: string;
  images: ImageInfo[];
}

// Export other interfaces from src/types/index.ts if needed
export * from './types/index';

export enum ViewMode {
  GRID = 'grid',
  BANNER = 'banner',
  MASONRY = 'masonry',
  CAROUSEL = 'carousel',
}
