import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const folderPath = process.env.MAIN_DIRECTORY || path.join(process.cwd(), 'public', 'images');
      console.log('Scanning directory:', folderPath);  // Add this line for debugging
      
      const folders = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => ({
          name: dirent.name,
          path: path.join(folderPath, dirent.name).replace(/\\/g, '/')  // Use forward slashes for consistency
        }));

      res.status(200).json(folders);
    } catch (error) {
      console.error('Error reading folders:', error);
      res.status(500).json({ 
        error: 'Failed to read folders', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}