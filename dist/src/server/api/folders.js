// src/server/api/folders.ts
import express from 'express';
import path from 'path';
import { API_ROUTES } from '../../shared/constants.js';
import { getCachedFolders, cacheFolders } from '../utils/cache'; // Update cache utilities
import { getAllFolders } from '../../shared/utils/folderUtils'; // Add this import
import { checkRedisHealth } from '../utils/cache';
import mongoose from 'mongoose';
const router = express.Router();
router.get(API_ROUTES.FOLDERS, async (req, res) => {
    const mainDir = process.env.MAIN_DIRECTORY || path.join(process.cwd(), 'public', 'images');
    console.info('Accessing /api/folders endpoint');
    console.info('Main directory:', mainDir);
    res.setHeader('Content-Type', 'application/json');
    try {
        const cacheKey = `folders_${mainDir}`;
        let folders = await getCachedFolders(cacheKey);
        if (!folders) {
            folders = await getAllFolders(mainDir, 5); // Max depth 5
            await cacheFolders(cacheKey, JSON.stringify(folders));
        }
        console.info(`Folders found: ${folders.length}`);
        res.json(folders);
    }
    catch (error) {
        console.error('Error reading folders:', error);
        res.status(500).json({
            error: 'Failed to read folders',
            details: error.message,
        });
    }
});
router.get('/api/health', async (req, res) => {
    const mongoHealth = mongoose.connection.readyState === 1;
    const redisHealth = await checkRedisHealth();
    res.status(200).json({
        status: mongoHealth && redisHealth ? 'OK' : 'Error',
        mongodb: mongoHealth ? 'Connected' : 'Disconnected',
        redis: redisHealth ? 'Connected' : 'Disconnected'
    });
});
export default router;
//# sourceMappingURL=folders.js.map