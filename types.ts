// Interface for storing information about an image
export interface ImageInfo {
  id: string;      // Unique identifier for the image
  src: string;     // Source URL or path of the image
  alt: string;     // Alternative text for the image
  width: number;   // Width of the image in pixels
  height: number;  // Height of the image in pixels
}

// Interface for storing information about a folder
export interface FolderInfo {
  name: string;    // Name of the folder
  path: string;    // Path to the folder
}

// New interface for grouped images
export interface GroupedImageInfo {
  id: string;      // Unique identifier for the group
  title: string;   // Title of the group
  images: ImageInfo[]; // Array of ImageInfo objects
}