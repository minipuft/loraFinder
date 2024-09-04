/**
 * Image Information Interface
 * 
 * This interface defines the structure for storing information about an image in the application.
 * It includes properties for unique identification, source URL, alternative text, title, and dimensions.
 * 
 * @interface ImageInfo
 * @property {string} id - Unique identifier for the image.
 * @property {string} src - Source URL of the image.
 * @property {string} alt - Alternative text for the image, important for accessibility.
 * @property {string} title - Title or name of the image, used for display purposes.
 * @property {number} width - Width of the image in pixels.
 * @property {number} height - Height of the image in pixels.
 */
export interface ImageInfo {
  id: string;
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  isGrouped?: boolean;
  group?: {
    key: string;
    images: ImageInfo[];
    isCarousel: boolean;
  };
}

/**
 * Folder Information Interface
 * This interface represents the structure for storing information about a folder in the application.
 * Currently, it only includes the name of the folder, but can be extended for additional properties if needed.
 */
export interface FolderInfo {
  name: string;
}

/**
 * Upload Props Interface
 * This interface defines the properties required for components that handle file uploads.
 * It includes the currently selected folder and a callback function for when the upload is complete.
 */
export interface UploadProps {
  selectedFolder: string;
  onUploadComplete: () => void;
}

/** This interface defines the properties required for components that handle search functionality.*/
export interface SearchProps {
  onSearch: (query: string) => void;
}

/**
 * Image Feed Props Interface
 * 
 * This interface defines the properties required for the ImageFeed component.
 * It includes an array of image information to display and a loading state indicator.
 */
export interface ImageFeedProps {
  images: ImageInfo[];
  isLoading: boolean;
}

export interface ImageRowProps {
  images: ImageInfo[];
  onImageClick: (image: ImageInfo) => void;
  columns: number;
  zoom: number;
  isLastRow: boolean;
  rowHeight: number;
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