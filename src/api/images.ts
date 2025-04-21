import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { createCacheProvider } from '../server/lib/cache';
import { ImageInfo } from '../types/index.js';
import { getImageDimensions, isImageFile } from '../utils/imageUtils.js';

// Define the structure for cached dimensions
interface ImageDimensions {
  width: number;
  height: number;
}

// Create a cache instance specifically for image dimensions
const dimensionsCache = createCacheProvider<ImageDimensions>('lru', {
  maxItems: parseInt(process.env.SERVER_LRU_MAX_ITEMS || '1000', 10), // Higher limit for dimensions
  ttlMs: parseInt(process.env.SERVER_LRU_TTL_MS || '3600000', 10), // 1 hour default TTL
});

const router = express.Router();

router.get('/images', async (req, res) => {
  const { folder } = req.query;

  if (!folder) {
    return res.status(400).json({ error: 'Folder parameter is required' });
  }

  if (typeof folder !== 'string') {
    return res.status(400).json({ error: 'Folder parameter must be a string' });
  }

  if (folder.includes('..') || folder.includes('\\')) {
    return res.status(400).json({ error: 'Invalid folder path' });
  }

  try {
    const images = await getImages(folder);
    res.status(200).json(images);
  } catch (error: any) {
    console.error('Error in getImages:', error);
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      res.status(404).json({ error: `Folder not found: ${folder}` });
    } else if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({
        error: 'Failed to fetch images',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

async function getImages(folder: string): Promise<ImageInfo[]> {
  const mainDirectory = process.env.MAIN_DIRECTORY || process.cwd();
  const imagesDirectory = path.join(mainDirectory, folder);

  const normalizedImagesDir = path.normalize(imagesDirectory);
  const normalizedMainDir = path.normalize(mainDirectory);
  if (!normalizedImagesDir.startsWith(normalizedMainDir)) {
    throw new Error('Invalid folder path: Access denied');
  }

  let fileNames: string[];
  try {
    fileNames = await fs.readdir(imagesDirectory);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Folder not found: ${folder}`);
    } else {
      console.error(`Error reading directory ${imagesDirectory}:`, error);
      throw new Error('Failed to read image directory');
    }
  }

  const imagePromises = fileNames.filter(isImageFile).map(async fileName => {
    try {
      const id = fileName.replace(/\.[^/.]+$/, '');
      const filePath = path.join(imagesDirectory, fileName);
      const cacheKey = `dimensions:${filePath}`; // Cache key based on full file path

      // 1. Check cache for dimensions
      let dimensions = await dimensionsCache.get(cacheKey);

      if (!dimensions) {
        // 2. Cache miss: Get dimensions from disk
        dimensions = await getImageDimensions(filePath);
        // 3. Store in cache
        await dimensionsCache.set(cacheKey, dimensions);
      }

      return {
        id,
        src: `/api/image?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(fileName)}`,
        alt: fileName,
        title: fileName,
        width: dimensions.width, // Use cached or fetched dimensions
        height: dimensions.height, // Use cached or fetched dimensions
      } satisfies ImageInfo;
    } catch (error) {
      console.error(`Error processing image ${fileName}:`, error);
      return null;
    }
  });

  const results = await Promise.all(imagePromises);
  const images: ImageInfo[] = results.filter((image): image is ImageInfo => image !== null);

  return images;
}

export default router;
