// Cache Time-To-Live: Duration in milliseconds for which cached data remains valid
export const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600000', 10);

// Maximum upload size: Limit for file uploads in bytes (default is ~1.5GB)
export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '1610612736', 10);

// Supported image formats: List of file extensions for allowed image uploads
export const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];

// API base URL: Root URL for API endpoints
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Server port: Port number on which the server will listen
export const PORT = parseInt(process.env.PORT || '3000', 10);

// Host: Hostname or IP address on which the server will run
export const HOST = process.env.HOST || 'localhost';