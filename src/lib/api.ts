import axios from "axios";
import { ImageInfo, FolderInfo } from "../types.js";

const api = axios.create({
  baseURL: "/api", // Assuming your API routes are under /api
});

/**
 * Fetches the list of folders from the server.
 *
 * @returns {Promise<FolderInfo[]>} A promise that resolves to an array of folder information.
 * @throws Will throw an error if the API request fails.
 */
export async function getFolders(): Promise<FolderInfo[]> {
  try {
    const response = await api.get("/folders");
    return response.data.map((folder: { name: string; path: string }) => ({
      name: folder.name,
      path: folder.path,
    }));
  } catch (error) {
    console.error("Error in getFolders:", error);
    throw new Error("Failed to fetch folders");
  }
}

/**
 * Fetches the list of images for a specific folder from the server.
 *
 * @param {string} folder - The name of the folder to fetch images from.
 * @returns {Promise<ImageInfo[]>} A promise that resolves to an array of image information.
 * @throws Will throw an error if the API request fails.
 */
export async function getImages(folder: string): Promise<ImageInfo[]> {
  try {
    const response = await api.get(
      `/images?folder=${encodeURIComponent(folder)}`
    );
    return response.data;
  } catch (error) {
    console.error("Error in getImages:", error);
    throw new Error("Failed to fetch images");
  }
}
/**
 * Uploads files to a specified folder on the server.
 *
 * @param {string} folder - The name of the folder to upload files to.
 * @param {File[]} files - An array of File objects to be uploaded.
 * @param {function} onProgress - A callback function to report upload progress.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 * @throws Will throw an error if the API request fails.
 */
export async function uploadFiles(
  folder: string,
  files: File[],
  onProgress: (progress: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append("folder", folder);
  files.forEach((file) => formData.append("files", file));

  try {
    await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  } catch (error) {
    console.error("Error in uploadFiles:", error);
    throw new Error("Failed to upload files");
  }
}
/**
 * Searches for images across all folders based on a query string.
 *
 * @param {string} query - The search query string.
 * @returns {Promise<ImageInfo[]>} A promise that resolves to an array of image information matching the search query.
 * @throws Will throw an error if the API request fails.
 */
export async function searchImages(query: string): Promise<ImageInfo[]> {
  try {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error("Error in searchImages:", error);
    throw new Error("Failed to search images");
  }
}

/**
 * Fetches the current main directory from the server.
 *
 * @returns {Promise<string>} A promise that resolves to the current main directory path.
 * @throws Will throw an error if the API request fails.
 */
export async function getCurrentDirectory(): Promise<string> {
  try {
    const response = await api.get("/getCurrentDirectory");
    return response.data.currentDirectory;
  } catch (error) {
    console.error("Error in getCurrentDirectory:", error);
    throw new Error("Failed to get current directory");
  }
}
