// src/server/utils/cache.ts
import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../../shared/utils/logger.js';
dotenv.config();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
});
redis.on('connect', () => {
    logger.info('Connected to Redis successfully.');
});
redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
    // Implement a fallback mechanism or graceful degradation here
});
const inMemoryCache = new Map();
const fallbackCache = {
    set: async (key, value, ttl) => {
        inMemoryCache.set(key, value);
        setTimeout(() => inMemoryCache.delete(key), ttl * 1000);
    },
    get: async (key) => inMemoryCache.get(key),
};
export const cacheFolders = async (key, data) => {
    try {
        await redis.set(key, data, 'EX', 300);
    }
    catch (error) {
        logger.warn('Failed to cache folders in Redis, using in-memory fallback');
        await fallbackCache.set(key, data, 300);
    }
};
export const getCachedFolders = async (key) => {
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : undefined;
    }
    catch (error) {
        logger.warn('Failed to get cached folders from Redis, using in-memory fallback');
        const data = await fallbackCache.get(key);
        return data ? JSON.parse(data) : undefined;
    }
};
// Existing cacheImage and getCachedImage functions...
export const cacheImage = async (id, data) => {
    await redis.set(`image:${id}`, data, 'EX', 3600); // Cache for 1 hour
};
export const getCachedImage = async (id) => {
    return await redis.get(`image:${id}`);
};
export const checkRedisHealth = async () => {
    try {
        await redis.ping();
        return true;
    }
    catch (error) {
        logger.error('Redis health check failed:', error);
        return false;
    }
};
//# sourceMappingURL=cache.js.map