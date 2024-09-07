// Cache Time-To-Live: Duration in milliseconds for which cached data remains valid
export const CACHE_TTL = 600000;

// Maximum upload size: Limit for file uploads in bytes (default is ~1.5GB)
export const MAX_UPLOAD_SIZE = 1610612736;

// Supported image formats: List of file extensions for allowed image uploads
export const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];

// API base URL: Root URL for API endpoints
export const API_BASE_URL = 'http://localhost:3000/api';

// Server port: Port number on which the server will listen
export const PORT = 3000;

// Host: Hostname or IP address on which the server will run
export const HOST = 'localhost';

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