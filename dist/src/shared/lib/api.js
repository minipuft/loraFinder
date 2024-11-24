/// <reference path="../types/api.d.ts" />
import axios from "axios";
import { API_ROUTES } from "../../shared/constants.js";
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
});
/**
 * Fetches the list of folders from the server.
 *
 * @returns {Promise<FolderInfo[]>} A promise that resolves to an array of folder information.
 * @throws Will throw an error if the API request fails.
 */
export const getFolders = async () => {
    try {
        console.log('Fetching folders from:', `${api.defaults.baseURL}/api/folders`);
        const response = await api.get(API_ROUTES.FOLDERS);
        console.log('Response headers:', response.headers);
        if (response.headers["content-type"].includes("application/json")) {
            return response.data;
        }
        else {
            console.error(`Unexpected content type: ${response.headers["content-type"]}`);
            console.error("Response data:", response.data);
            throw new Error(`Server returned unexpected content type: ${response.headers["content-type"]}`);
        }
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Axios error:", error.message);
            console.error("Response:", error.response?.data);
            console.error("Request URL:", error.config?.url);
            console.error("Request method:", error.config?.method);
            throw new Error(`Failed to fetch folders: ${error.message}`);
        }
        console.error("Error fetching folders:", error);
        throw new Error("Failed to fetch folders. Please try again later.");
    }
};
/**
 * Fetches the list of images for a specific folder from the server.
 *
 * @param {string} folder - The name of the folder to fetch images from.
 * @returns {Promise<ImageInfo[]>} A promise that resolves to an array of image information.
 * @throws Will throw an error if the API request fails.
 */
export async function getImages(folder) {
    if (!folder) {
        console.warn("Folder parameter is missing or empty");
        return [];
    }
    try {
        const response = await api.get(`/api/images?folder=${encodeURIComponent(folder)}`);
        return response.data.map(img => ({
            ...img,
            width: isNaN(img.width) ? 0 : img.width,
            height: isNaN(img.height) ? 0 : img.height
        }));
    }
    catch (error) {
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
export const uploadFiles = async (folder, files, onProgress) => {
    const formData = new FormData();
    formData.append("folder", folder);
    files.forEach((file) => formData.append("files", file));
    try {
        await api.post("/api/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            },
        });
    }
    catch (error) {
        console.error("Error in uploadFiles:", error);
        throw new Error("Failed to upload files");
    }
};
/**
 * Searches for images across all folders based on a query string.
 *
 * @param {string} query - The search query string.
 * @returns {Promise<ImageInfo[]>} A promise that resolves to an array of image information matching the search query.
 * @throws Will throw an error if the API request fails.
 */
export const searchImages = async (query) => {
    try {
        const response = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
        return response.data;
    }
    catch (error) {
        console.error("Error in searchImages:", error);
        throw new Error("Failed to search images");
    }
};
/**
 * Fetches the current main directory from the server.
 *
 * @returns {Promise<string>} A promise that resolves to the current main directory path.
 * @throws Will throw an error if the API request fails.
 */
export const getCurrentDirectory = async () => {
    try {
        const response = await api.get("/api/getCurrentDirectory");
        return response.data.currentDirectory;
    }
    catch (error) {
        console.error("Error in getCurrentDirectory:", error);
        throw new Error("Failed to get current directory");
    }
};
export const deleteImage = async (imageId) => {
    try {
        await api.delete(`/api/images/${imageId}`);
    }
    catch (error) {
        console.error("Error in deleteImage:", error);
        throw new Error("Failed to delete image");
    }
};
//# sourceMappingURL=api.js.map