export const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600000', 10);
export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '1610612736', 10);
export const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const HOST = process.env.HOST || 'localhost';