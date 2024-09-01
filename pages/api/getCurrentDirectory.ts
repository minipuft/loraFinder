import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API handler for retrieving the current main directory.
 * This endpoint returns the path set in the MAIN_DIRECTORY environment variable.
 * 
 * @param {NextApiRequest} req - The incoming request object.
 * @param {NextApiResponse} res - The response object.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Retrieve the main directory from environment variables
    const mainDir = process.env.MAIN_DIRECTORY;
    
    if (!mainDir) {
      throw new Error('MAIN_DIRECTORY is not set in environment variables');
    }
    
    // Check if the directory exists
    if (fs.existsSync(mainDir)) {
      res.status(200).json({ currentDirectory: mainDir });
    } else {
      res.status(404).json({ error: 'Main directory not found' });
    }
  } catch (error) {
    console.error('Error in getCurrentDirectory:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}