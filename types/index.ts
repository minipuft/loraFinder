/**
 * Represents the information for an image in the application.
 * 
 * @interface ImageInfo
 * @property {string} id - Unique identifier for the image.
 * @property {string} src - Source URL of the image.
 * @property {string} alt - Alternative text for the image.
 * @property {string} title - Title or name of the image.
 * @property {number} height - Height of the image.
 * @property {number} width - Width of the image.
 */
export interface ImageInfo {
  id: string;
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
}

/**
 * Represents the information for a folder in the application.
 * 
 * @interface FolderInfo
 * @property {string} name - Name of the folder.
 */
export interface FolderInfo {
  name: string;
}

/**
 * Represents the props for components that handle file uploads.
 * 
 * @interface UploadProps
 * @property {string} selectedFolder - The currently selected folder for upload.
 * @property {() => void} onUploadComplete - Callback function to be called when upload is complete.
 */
export interface UploadProps {
  selectedFolder: string;
  onUploadComplete: () => void;
}

/**
 * Represents the props for components that handle search functionality.
 * 
 * @interface SearchProps
 * @property {(query: string) => void} onSearch - Callback function to handle search queries.
 */
export interface SearchProps {
  onSearch: (query: string) => void;
}

/**
 * Represents the props for the ImageFeed component.
 * 
 * @interface ImageFeedProps
 * @property {ImageInfo[]} images - Array of image information to display.
 * @property {boolean} isLoading - Indicates if images are currently being loaded.
 */
export interface ImageFeedProps {
  images: ImageInfo[];
  isLoading: boolean;
}