import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { folder, file } = req.query;
  const mainDir = process.env.MAIN_DIRECTORY;

  if (!mainDir) {
    return res.status(500).json({ error: 'MAIN_DIRECTORY is not set in environment variables' });
  }

  if (typeof folder !== 'string' || typeof file !== 'string') {
    return res.status(400).json({ error: 'Invalid folder or file parameter' });
  }

  const filePath = path.join(mainDir, folder, file);

  if (fs.existsSync(filePath)) {
    const imageBuffer = fs.readFileSync(filePath);
    const contentType = getContentType(path.extname(file));
    res.setHeader('Content-Type', contentType);
    res.send(imageBuffer);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
}

function getContentType(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}