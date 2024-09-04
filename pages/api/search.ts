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
    // Extract search query from request
    const { q } = req.query;
    // Get main directory from environment variables
    const mainDir = process.env.MAIN_DIRECTORY;

    // Validate main directory
    if (!mainDir) {
      throw new Error('MAIN_DIRECTORY is not set in environment variables');
    }

    // Validate search query
    if (typeof q !== 'string') {
      return res.status(400).json({ error: 'Invalid search query' });
    }

    // Initialize array to store search results
    const searchResults: ImageInfo[] = [];

    // Recursive function to search for images in all subdirectories
    const searchDirectory = (dir: string) => {
      // Read directory contents
      const files = fs.readdirSync(dir);

      // Iterate through each file/directory
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        // If directory, recursively search it
        if (stat.isDirectory()) {
          searchDirectory(filePath);
        } else if (stat.isFile() && /\.(jpg|jpeg|png|gif)$/i.test(file)) {
          // If file is an image and matches search query
          if (file.toLowerCase().includes(q.toLowerCase())) {
            // Calculate relative path and add to search results
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

    // Send search results as JSON response
    res.status(200).json(searchResults);
  } catch (error) {
    // Log and handle any errors
    console.error('Error in search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}