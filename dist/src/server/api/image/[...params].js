// src/server/api/image/[...params].ts
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { API_ROUTES } from '../../../shared/constants.js';
import Image from '../../../server/models/Image.js';
import logger from '../../../shared/utils/logger.js';
import { getCachedImage, cacheImage } from '../../../server/utils/cache.js';
import { getContentType } from '../../../server/utils/imageUtils.js'; // Utility to determine MIME type
const router = express.Router();
const paramsSchema = z.array(z.string().min(1)).min(1);
router.get(API_ROUTES.IMAGE_DYNAMIC, async (req, res) => {
    const params = req.params[0].split('/');
    const result = paramsSchema.safeParse(params);
    if (!result.success) {
        return res
            .status(400)
            .json({ error: 'Invalid input', details: result.error.issues });
    }
    const mainDirectory = process.env.MAIN_DIRECTORY || '';
    const cleanParams = result.data.filter((param) => param !== 'api' && param !== 'image');
    const filePath = path.join(mainDirectory, ...cleanParams);
    try {
        // Fetch image metadata from the database based on file path
        const image = await Image.findOne({ src: filePath }).lean();
        if (!image) {
            logger.error('Image not found in database:', filePath);
            return res.status(404).json({ error: 'Image not found' });
        }
        // Check cache first
        const cachedData = await getCachedImage(image._id.toString());
        if (cachedData) {
            res.setHeader('Content-Type', getContentType(path.extname(filePath)));
            return res.send(Buffer.from(cachedData, 'base64'));
        }
        // Serve the image file
        res.sendFile(filePath, async (err) => {
            if (err) {
                logger.error('Error sending file:', err);
                res.status(500).json({ error: 'Internal Server Error' });
            }
            else {
                try {
                    // Read the file and cache it
                    const buffer = await fs.readFile(filePath);
                    await cacheImage(image._id.toString(), buffer.toString('base64'));
                }
                catch (cacheError) {
                    logger.error('Error caching image:', cacheError);
                }
            }
        });
    }
    catch (error) {
        logger.error('Error fetching dynamic image:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
export default router;
//# sourceMappingURL=%5B...params%5D.js.map