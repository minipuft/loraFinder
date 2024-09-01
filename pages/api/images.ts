import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ImageInfo } from '@/types';

// Add this function to check if a file is an image
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return imageExtensions.includes(path.extname(filename).toLowerCase());
}

/**
 * API handler for retrieving images from a specified folder.
 * 
 * @param {NextApiRequest} req - The incoming request object.
 * @param {NextApiResponse} res - The response object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { folder } = req.query;

    if (!folder || typeof folder !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing folder parameter' });
    }

    try {
      const images = await getImages(folder);
      res.status(200).json(images);
    } catch (error) {
      console.error('Error in getImages:', error);
      res.status(500).json({ error: 'Failed to fetch images' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getImages(folder: string): Promise<ImageInfo[]> {
  const mainDirectory = process.env.MAIN_DIRECTORY || process.cwd();
  const imagesDirectory = path.join(mainDirectory, folder);
  
  console.log('Attempting to access folder:', imagesDirectory);

  if (!fs.existsSync(imagesDirectory)) {
    throw new Error(`Folder not found: ${imagesDirectory}`);
  }

  const fileNames = fs.readdirSync(imagesDirectory);
  const images: ImageInfo[] = await Promise.all(
    fileNames
      .filter(isImageFile) // Add this line to filter image files
      .map(async (fileName) => {
        const id = fileName.replace(/\.[^/.]+$/, '');
        const filePath = path.join(imagesDirectory, fileName);
        const { width, height } = await getImageDimensions(filePath);

        return {
          id,
          src: `/api/image/${folder}/${fileName}`, // Update this line
          alt: fileName,
          width,
          height,
        };
      })
  );

  return images;
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  // Implement image dimension retrieval logic here
  // You can use libraries like 'image-size' or 'sharp' for this purpose
  // For now, we'll return placeholder values
  return { width: 800, height: 600 };
}