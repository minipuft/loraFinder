import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();

router.get('/folders', async (req, res) => {
  const mainDir = process.env.MAIN_DIRECTORY || path.join(process.cwd(), 'public', 'images');

  try {
    const dirents = await fs.readdir(mainDir, { withFileTypes: true });

    const folders = dirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => ({
        name: dirent.name,
        path: path.join(mainDir, dirent.name).replace(/\\/g, '/'),
      }));

    res.json(folders);
  } catch (error) {
    console.error('Error reading folders:', error);
    let errorMessage = 'Failed to read folders';
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      errorMessage = `Directory not found: ${mainDir}`;
      console.error(errorMessage);
      res.status(404).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
});

export default router;
