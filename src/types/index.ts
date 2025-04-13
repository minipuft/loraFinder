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
