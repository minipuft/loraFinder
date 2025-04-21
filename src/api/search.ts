import express from 'express';
import fs from 'fs';
import path from 'path';
import { ImageInfo } from '../types/index.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const mainDir = process.env.MAIN_DIRECTORY;

    if (!mainDir) {
      throw new Error('MAIN_DIRECTORY is not set in environment variables');
    }

    if (typeof q !== 'string') {
      return res.status(400).json({ error: 'Invalid search query' });
    }

    const searchResults: ImageInfo[] = [];

    const searchDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          searchDirectory(filePath);
        } else if (stat.isFile() && /\.(jpg|jpeg|png|gif)$/i.test(file)) {
          if (file.toLowerCase().includes(q.toLowerCase())) {
            const relativePath = path.relative(mainDir, dir);
            searchResults.push({
              id: Buffer.from(filePath).toString('base64'),
              src: `/api/image?folder=${encodeURIComponent(relativePath)}&file=${encodeURIComponent(file)}`,
              alt: file,
              title: file, // Add this line
              width: 0,
              height: 0,
            });
          }
        }
      }
    };

    searchDirectory(mainDir);

    res.status(200).json(searchResults);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
