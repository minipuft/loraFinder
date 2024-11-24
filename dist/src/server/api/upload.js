import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { API_ROUTES } from '../../shared/constants.js';
import logger from '../../shared/utils/logger.js';
import Image from '../models/Image';
import { cacheImage } from '../utils/cache.js';
import { getImageDimensions, isImageFile } from '../utils/imageUtils.js';
const router = express.Router();
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const uploadSchema = z.object({
    folder: z.string().min(1),
    files: z.array(z.any()).min(1),
});
router.post(API_ROUTES.UPLOAD, async (req, res) => {
    const form = new formidable.IncomingForm({
        maxFileSize: MAX_UPLOAD_SIZE,
        uploadDir: path.join(process.cwd(), 'public', 'uploads'),
        keepExtensions: true,
    });
    form.parse(req, async (err, fields, files) => {
        if (err) {
            logger.error('Error parsing form:', err);
            return res.status(500).json({ error: 'Error uploading files' });
        }
        const result = uploadSchema.safeParse({
            folder: Array.isArray(fields.folder) ? fields.folder[0] : fields.folder,
            files: Array.isArray(files.files) ? files.files : [files.files],
        });
        if (!result.success) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: result.error.issues });
        }
        const { folder, files: uploadedFiles } = result.data;
        try {
            const targetDir = path.join(process.cwd(), 'public', 'uploads', folder);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const images = [];
            for (const file of uploadedFiles) {
                const fileName = path.basename(file.path);
                const filePath = path.join(targetDir, fileName);
                // Check if the file is a valid image
                if (!isImageFile(filePath)) {
                    logger.warn(`File is not a valid image: ${filePath}`);
                    continue; // Skip non-image files
                }
                fs.renameSync(file.path, filePath);
                // Extract metadata using sharp or any other library
                const { width, height } = await getImageDimensions(filePath); // Ensure this utility is implemented
                // Create image metadata entry
                const image = new Image({
                    title: path.parse(fileName).name,
                    src: filePath,
                    alt: path.parse(fileName).name,
                    width,
                    height,
                    folder,
                    uploadDate: new Date(),
                });
                const savedImage = await image.save();
                // Cache the image metadata
                if (savedImage._id && typeof savedImage._id.toString === 'function') {
                    await cacheImage(savedImage._id.toString(), savedImage.src);
                }
                else {
                    logger.warn(`Unable to cache image: Invalid _id for image ${savedImage.src}`);
                }
                images.push(savedImage);
            }
            res.status(200).json({ message: 'Files uploaded successfully', images });
        }
        catch (error) {
            logger.error('Error processing uploaded files:', error);
            res.status(500).json({ error: 'Error processing uploaded files' });
        }
    });
});
export default router;
//# sourceMappingURL=upload.js.map