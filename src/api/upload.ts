import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

router.post('/upload', async (req, res) => {
  const form = new formidable.IncomingForm({
    maxFileSize: MAX_UPLOAD_SIZE,
    uploadDir: path.join(process.cwd(), 'public', 'uploads'),
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ error: 'Error uploading files' });
    }

    const folder = Array.isArray(fields.folder) ? fields.folder[0] : fields.folder;
    if (!folder) {
      return res.status(400).json({ error: 'Folder not specified' });
    }

    const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
    const uploadedFilePaths = uploadedFiles
      .filter((file): file is formidable.File => file !== undefined)
      .map(file => file.filepath);

    try {
      const targetDir = path.join(process.cwd(), 'public', 'uploads', folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      uploadedFilePaths.forEach(filePath => {
        const fileName = path.basename(filePath);
        fs.renameSync(filePath, path.join(targetDir, fileName));
      });

      res.status(200).json({ message: 'Files uploaded successfully' });
    } catch (error) {
      console.error('Error moving files:', error);
      res.status(500).json({ error: 'Error processing uploaded files' });
    }
  });
});

export default router;
