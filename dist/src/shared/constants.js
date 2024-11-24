/// <reference types="vite/client" />
const env = import.meta.env || {};
const getEnv = (key, defaultValue) => {
    return env[key] || defaultValue;
};
// Cache Time-To-Live: Duration in milliseconds for which cached data remains valid
export const CACHE_TTL = parseInt(getEnv('VITE_CACHE_TTL', '600000'), 10);
// Maximum upload size: Limit for file uploads in bytes (default is ~1.5GB)
export const MAX_UPLOAD_SIZE = parseInt(getEnv('VITE_MAX_UPLOAD_SIZE', '1610612736'), 10);
// Supported image formats: List of file extensions for allowed image uploads
export const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];
// Client port: Port number for the Vite dev server
export const CLIENT_PORT = parseInt(getEnv('VITE_CLIENT_PORT', '5173'), 10);
// API port: Port number on which the API server will listen
export const API_PORT = parseInt(getEnv('VITE_API_PORT', '3000'), 10);
// API base URL: Root URL for API endpoints
export const API_BASE_URL = getEnv('VITE_API_BASE_URL', `http://localhost:${API_PORT}`);
// Host: Hostname or IP address on which the server will run
export const HOST = getEnv('VITE_HOST', 'localhost');
// Custom properties for dynamic styling
export const CUSTOM_PROPERTIES = {
    SCROLL_Y: '--scroll-y',
    MOUSE_X: '--mouse-x',
    MOUSE_Y: '--mouse-y',
};
// Default values for custom properties
export const DEFAULT_CUSTOM_PROPERTY_VALUES = {
    [CUSTOM_PROPERTIES.SCROLL_Y]: '0px',
    [CUSTOM_PROPERTIES.MOUSE_X]: '0px',
    [CUSTOM_PROPERTIES.MOUSE_Y]: '0px',
};
// API route constants
export const API_ROUTES = {
    FOLDERS: '/api/folders',
    IMAGES: '/api/images',
    IMAGE: '/api/image',
    SEARCH: '/api/search',
    UPLOAD: '/api/upload',
    HEALTH: '/api/health',
    GET_CURRENT_DIRECTORY: '/api/getCurrentDirectory',
    IMAGE_DYNAMIC: '/api/image/*',
};
//# sourceMappingURL=constants.js.map