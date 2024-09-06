import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
router.get('/image/*', (req, res) => {
    console.log("API route called with params:", req.params);
    const params = req.params[0].split('/');
    const mainDirectory = process.env.MAIN_DIRECTORY || "";
    const cleanParams = params.filter((param) => param !== "api" && param !== "image");
    const filePath = path.join(mainDirectory, ...cleanParams);
    console.log("Requested params:", params);
    console.log("Clean params:", cleanParams);
    console.log("Main directory:", mainDirectory);
    console.log("Requested file path:", filePath);
    if (fs.existsSync(filePath)) {
        const imageBuffer = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);
        console.log("Content-Type:", contentType);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.send(imageBuffer);
    }
    else {
        console.log("File not found:", filePath);
        res.status(404).json({ error: "Image not found" });
    }
});
export default router;
// Helper function to determine the content type based on file extension
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".gif":
            return "image/gif";
        case ".webp":
            return "image/webp";
        default:
            return "application/octet-stream";
    }
}
//# sourceMappingURL=%5B...params%5D.js.map