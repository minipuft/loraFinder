import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
router.get('/image', (req, res) => {
    const { folder, file } = req.query;
    const mainDir = process.env.MAIN_DIRECTORY;
    if (!mainDir) {
        return res.status(500).json({ error: "MAIN_DIRECTORY is not set in environment variables" });
    }
    if (typeof folder !== "string" || typeof file !== "string") {
        return res.status(400).json({ error: "Invalid folder or file parameter" });
    }
    const filePath = path.join(mainDir, folder, file);
    if (fs.existsSync(filePath)) {
        const imageBuffer = fs.readFileSync(filePath);
        const contentType = getContentType(path.extname(file));
        res.setHeader("Content-Type", contentType);
        res.send(imageBuffer);
    }
    else {
        res.status(404).json({ error: "Image not found" });
    }
});
export default router;
// Helper function to determine the content type based on file extension
function getContentType(extension) {
    switch (extension.toLowerCase()) {
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".png":
            return "image/png";
        case ".gif":
            return "image/gif";
        default:
            return "application/octet-stream";
    }
}
//# sourceMappingURL=image.js.map