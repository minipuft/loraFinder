import express from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const router = express.Router();

// Basic Cache (Replace with a more robust solution if needed)
const imageCache = new Map<string, Buffer>();
const CACHE_MAX_SIZE = 100; // Example limit

router.get('/image', async (req, res) => {
  const { folder, file, w, h } = req.query;
  const mainDir = process.env.MAIN_DIRECTORY;

  if (!mainDir) {
    return res.status(500).json({ error: 'MAIN_DIRECTORY is not set' });
  }

  if (typeof folder !== 'string' || typeof file !== 'string') {
    return res.status(400).json({ error: 'Invalid folder or file' });
  }

  const filePath = path.join(mainDir, folder, file);

  // --- Dimension Parsing ---
  let targetWidth: number | undefined = parseInt(w as string, 10);
  let targetHeight: number | undefined = parseInt(h as string, 10);
  if (isNaN(targetWidth)) targetWidth = undefined;
  if (isNaN(targetHeight)) targetHeight = undefined;

  // Basic validation (adjust limits as needed)
  if (targetWidth !== undefined && (targetWidth <= 0 || targetWidth > 4000)) {
    return res.status(400).json({ error: 'Invalid width parameter' });
  }
  if (targetHeight !== undefined && (targetHeight <= 0 || targetHeight > 4000)) {
    return res.status(400).json({ error: 'Invalid height parameter' });
  }

  try {
    // Check if file exists before proceeding
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // --- Serve Original if no dimensions requested ---
    if (targetWidth === undefined && targetHeight === undefined) {
      const contentType = getContentType(path.extname(file));
      res.setHeader('Content-Type', contentType);
      // Use stream for potentially large originals
      fs.createReadStream(filePath).pipe(res);
      return; // Important: stop execution here
    }

    // --- Handle Resizing ---
    const format = req.accepts('image/webp') ? 'webp' : 'jpeg'; // Prefer WebP
    const cacheKey = `${filePath}_w${targetWidth || 'auto'}_h${targetHeight || 'auto'}_${format}`;

    // Check cache
    if (imageCache.has(cacheKey)) {
      console.log(`Serving from cache: ${cacheKey}`);
      res.setHeader('Content-Type', format === 'webp' ? 'image/webp' : 'image/jpeg');
      return res.send(imageCache.get(cacheKey));
    }

    console.log(`Resizing: ${cacheKey}`);
    const transformer = sharp(filePath).resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'inside', // Maintain aspect ratio within bounds
      withoutEnlargement: true, // Don't upscale
    });

    // Set output format
    if (format === 'webp') {
      transformer.webp({ quality: 80 });
    } else {
      transformer.jpeg({ quality: 85, progressive: true }); // Progressive JPEG
    }

    // Get buffer, send, and cache
    const outputBuffer = await transformer.toBuffer();

    // Add to cache (simple eviction)
    if (imageCache.size >= CACHE_MAX_SIZE) {
      const firstKey = imageCache.keys().next().value;
      if (firstKey) {
        imageCache.delete(firstKey);
      }
    }
    imageCache.set(cacheKey, outputBuffer);

    res.setHeader('Content-Type', format === 'webp' ? 'image/webp' : 'image/jpeg');
    res.send(outputBuffer);
  } catch (error) {
    console.error(`Error processing image ${filePath}:`, error);
    res.status(500).json({ error: 'Error processing image' });
  }
});

export default router;

// Helper function to determine the content type based on file extension
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
