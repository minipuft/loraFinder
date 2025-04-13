import express from 'express';
import fs from 'fs';
import path from 'path';
import { ImageInfo } from '../types.js';
import { isImageFile, getImageDimensions } from '../utils/imageUtils.js';

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
    if (error.message.includes('Folder not found')) {
      res.status(404).json({ error: `Folder not found: ${folder}` });
    } else {
      res.status(500).json({ error: 'Failed to fetch images', details: error.message });
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

  if (!fs.existsSync(imagesDirectory)) {
    throw new Error(`Folder not found: ${folder}`);
  }

  const fileNames = fs.readdirSync(imagesDirectory);

  // First collect the promises with proper typing
  const imagePromises = fileNames.filter(isImageFile).map(async fileName => {
    try {
      const id = fileName.replace(/\.[^/.]+$/, '');
      const filePath = path.join(imagesDirectory, fileName);
      const { width, height } = await getImageDimensions(filePath);

      return {
        id,
        src: `/api/image?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(fileName)}`,
        alt: fileName,
        title: fileName,
        width,
        height,
      } satisfies ImageInfo;
    } catch (error) {
      console.error(`Error processing image ${fileName}:`, error);
      return null;
    }
  });

  // Then resolve promises and filter out nulls with type guard
  const results = await Promise.all(imagePromises);
  const images: ImageInfo[] = results.filter((image): image is ImageInfo => image !== null);

  return images;
}

export default router;
