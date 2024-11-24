// src/server/api/image.ts
import express from 'express';
import { z } from 'zod';
import { API_ROUTES } from '../../shared/constants.js';
import Image from '../models/Image';
import logger from '../../shared/utils/logger.js';
import { getCachedImage, cacheImage } from '../utils/cache';
import path from 'path';
import fs from 'fs/promises';
import { getContentType } from '../utils/imageUtils';
const router = express.Router();
const querySchema = z.object({
    id: z.string().min(1),
});
router.get(API_ROUTES.IMAGE, async (req, res) => {
    const result = querySchema.safeParse(req.query);
    if (!result.success) {
        return res
            .status(400)
            .json({ error: 'Invalid input', details: result.error.issues });
    }
    const { id } = result.data;
    try {
        // Check cache first
        const cachedData = await getCachedImage(id);
        if (cachedData) {
            res.setHeader('Content-Type', 'image/jpeg'); // Adjust based on image type
            return res.send(Buffer.from(cachedData, 'base64'));
        }
        const image = await Image.findById(id).lean();
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }
        const filePath = image.src; // Assuming src is the file path
        // Read image file
        const imageBuffer = await fs.readFile(filePath);
        // Cache the image data
        await cacheImage(id, imageBuffer.toString('base64'));
        res.setHeader('Content-Type', getContentType(path.extname(filePath)));
        res.send(imageBuffer);
    }
    catch (error) {
        logger.error('Error fetching image:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
export default router;
//# sourceMappingURL=image.js.map