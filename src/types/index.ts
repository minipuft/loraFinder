import { createImageProcessor } from '../workers/imageProcessor.js';

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

export interface FolderInfo {
  name: string;
  path: string;
}

export interface UploadProps {
  selectedFolder: string;
  onUploadComplete: () => void;
}

export interface SearchProps {
  onSearch: (query: string) => void;
}

export interface ImageFeedProps {
  images: ImageInfo[];
  isLoading: boolean;
}

export interface ImageRowProps {
  images: ImageInfo[];
  onImageClick: (image: ImageInfo, groupImages: ImageInfo[]) => void;
  columns: number;
  zoom: number;
  isLastRow: boolean;
  rowHeight: number;
  imageProcessor: ReturnType<typeof createImageProcessor>;
}

export interface LayoutProps {
  children: React.ReactNode;
  folders: FolderInfo[];
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  currentDirectory: string;
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isGrouped: boolean;
  onGroupToggle: () => void;
}

export interface NavbarProps {
  currentDirectory: string;
  onSearch: (query: string) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isGrouped: boolean;
  onGroupToggle: () => void;
}

export interface GroupedImageInfo {
  id: string;
  title: string;
  images: ImageInfo[];
}

export enum ViewMode {
  GRID = 'grid',
  BANNER = 'banner',
  MASONRY = 'masonry',
  CAROUSEL = 'carousel',
}

// Interface for the data stored in IndexedDB for cached images
export interface ProcessedImageCacheEntry {
  id: string;
  lowResUrl?: string; // Blob URL for low-res
  lowResWidth?: number;
  lowResHeight?: number;
  highResUrl?: string; // Blob URL for high-res
  width?: number; // Original requested width
  height?: number; // Original requested height
  timestamp?: number; // When it was cached
}

// Interface for the Comlink-exposed worker API
export interface ImageProcessorWorkerAPI {
  processImage(data: {
    id: string;
    // Accept ImageBitmap directly
    imageBitmap: ImageBitmap;
    width: number;
    height: number;
    signal?: AbortSignal;
  }): Promise<{ lowResUrl?: string; highResUrl?: string }>; // Return URLs

  processBatch(data: {
    // Batch expects bitmaps now
    images: Array<{ id: string; imageBitmap: ImageBitmap; width: number; height: number }>;
    signal?: AbortSignal;
    // Add callback for progress? Comlink supports callbacks
    // onProgress?: (processed: { id: string; lowResUrl?: string; highResUrl?: string }) => void;
  }): Promise<Array<{ id: string; lowResUrl?: string; highResUrl?: string }>>; // Return array of results
}
