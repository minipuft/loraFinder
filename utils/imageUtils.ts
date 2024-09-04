import path from "path";
import { ImageInfo } from "@/types";

// Section: Content Type Determination
/**
 * Determines the content type of a file based on its extension.
 * This function is crucial for setting the correct MIME type when serving images.
 *
 * @param {string} extension - The file extension (including the dot).
 * @returns {string} The corresponding content type.
 */
export function getContentType(extension: string): string {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

// Section: Image File Validation
/**
 * Checks if a file is an image based on its filename.
 * This function helps filter out non-image files during upload or processing.
 *
 * @param {string} filename - The name of the file to check.
 * @returns {boolean} True if the file is an image, false otherwise.
 */
export function isImageFile(filename: string): boolean {
  return /\.(jpg|jpeg|png|gif)$/i.test(filename);
}

// Section: Image Title Extraction
/**
 * Extracts the title of an image from its filename by removing the extension.
 * This is useful for displaying image names without file extensions in the UI.
 *
 * @param {string} filename - The name of the image file.
 * @returns {string} The title of the image.
 */
export function getImageTitle(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

// Section: Thumbnail Path Generation
/**
 * Generates a thumbnail path for a given image path.
 * This function is used to organize thumbnails in a separate directory structure.
 *
 * @param {string} imagePath - The full path of the original image.
 * @returns {string} The path for the thumbnail version of the image.
 */
export function getThumbnailPath(imagePath: string): string {
  const dir = path.dirname(imagePath);
  const filename = path.basename(imagePath);
  return path.join(dir, "thumbnails", filename);
}

// Section: File Size Validation
/**
 * Checks if the file size is within the allowed limit.
 * This function is important for preventing oversized file uploads.
 *
 * @param {number} fileSize - The size of the file in bytes.
 * @param {number} maxSize - The maximum allowed size in bytes.
 * @returns {boolean} True if the file size is within the limit, false otherwise.
 */
export function isFileSizeValid(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

// Section: Grouping Images by Name
/**
 * Groups images by their alt text (filename without extension).
 * This is useful for organizing images in a lightbox or gallery.
 *
 * @param {ImageInfo[]} images - The array of images to group.
 * @returns {{ [key: string]: ImageInfo[] }} - An object with grouped images.
 */
export function groupImagesByName(images: ImageInfo[]): {
  [key: string]: ImageInfo[];
} {
  const groups: { [key: string]: ImageInfo[] } = {};

  images.forEach((image) => {
    const baseName = image.alt.replace(/\s*\(\d+\)$/, '').trim();
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    groups[baseName].push(image);
  });

  return groups;
}
