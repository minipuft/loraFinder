import path from 'path';

/**
 * Determines the content type of a file based on its extension.
 * 
 * @param {string} extension - The file extension (including the dot).
 * @returns {string} The corresponding content type.
 */
export function getContentType(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Checks if a file is an image based on its filename.
 * 
 * @param {string} filename - The name of the file to check.
 * @returns {boolean} True if the file is an image, false otherwise.
 */
export function isImageFile(filename: string): boolean {
  return /\.(jpg|jpeg|png|gif)$/i.test(filename);
}

/**
 * Extracts the title of an image from its filename by removing the extension.
 * 
 * @param {string} filename - The name of the image file.
 * @returns {string} The title of the image.
 */
export function getImageTitle(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

/**
 * Generates a thumbnail path for a given image path.
 * 
 * @param {string} imagePath - The full path of the original image.
 * @returns {string} The path for the thumbnail version of the image.
 */
export function getThumbnailPath(imagePath: string): string {
  const dir = path.dirname(imagePath);
  const filename = path.basename(imagePath);
  return path.join(dir, 'thumbnails', filename);
}

/**
 * Checks if the file size is within the allowed limit.
 * 
 * @param {number} fileSize - The size of the file in bytes.
 * @param {number} maxSize - The maximum allowed size in bytes.
 * @returns {boolean} True if the file size is within the limit, false otherwise.
 */
export function isFileSizeValid(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}