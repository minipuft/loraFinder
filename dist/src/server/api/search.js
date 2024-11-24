// src/server/api/search.ts
import express from 'express';
import Image from '../models/Image';
import { z } from 'zod';
import { API_ROUTES } from '../../shared/constants.js';
import logger from '../../shared/utils/logger.js';
const router = express.Router();
const querySchema = z.object({
    q: z.string().min(1), // Search query
    folder: z.string().optional(), // Optional folder filter
});
router.get(API_ROUTES.SEARCH, async (req, res) => {
    try {
        const result = querySchema.safeParse(req.query);
        if (!result.success) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: result.error.issues });
        }
        const { q, folder } = result.data;
        // Build MongoDB query
        const mongoQuery = {
            title: { $regex: q, $options: 'i' }, // Case-insensitive search
        };
        if (folder) {
            mongoQuery.folder = folder;
        }
        // Add caching if necessary
        const cacheKey = `search_${q}_${folder || 'all'}`;
        // Implement caching logic here if desired
        const dbResults = await Image.find(mongoQuery).lean();
        const searchResults = dbResults.map(doc => ({
            ...doc,
            id: doc._id.toString(),
        }));
        res.status(200).json(searchResults);
    }
    catch (error) {
        logger.error('Error in search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
export default router;
//# sourceMappingURL=search.js.map