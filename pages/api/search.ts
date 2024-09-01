import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ImageInfo } from '../../types';

/**
 * API handler for searching images across all folders.
 * 
 * @param {NextApiRequest} req - The incoming request object.
 * @param {NextApiResponse} res - The response object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Recursive function to search for images in all subdirectories
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
              title: file,
              src: `/api/image?folder=${encodeURIComponent(relativePath)}&file=${encodeURIComponent(file)}`,
              alt: file,
            });
          }
        }
      }
    };

    // Start the search from the main directory
    searchDirectory(mainDir);

    res.status(200).json(searchResults);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}