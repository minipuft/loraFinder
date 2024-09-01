import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route called with query:', req.query);
  const { params } = req.query;
  const mainDirectory = process.env.MAIN_DIRECTORY || '';
  
  // Remove any 'api' and 'image' parts from the params
  const cleanParams = (params as string[]).filter(param => param !== 'api' && param !== 'image');
  
  const filePath = path.join(mainDirectory, ...cleanParams);

  console.log('Requested params:', params);
  console.log('Clean params:', cleanParams);
  console.log('Main directory:', mainDirectory);
  console.log('Requested file path:', filePath);

  if (fs.existsSync(filePath)) {
    const imageBuffer = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    console.log('Content-Type:', contentType);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.send(imageBuffer);
  } else {
    console.log('File not found:', filePath);
    res.status(404).json({ error: 'Image not found' });
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}
