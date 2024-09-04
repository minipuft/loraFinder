import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

// Main API handler function for serving images
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Extract folder and file from query parameters
  const { folder, file } = req.query;
  // Get the main directory from environment variables
  const mainDir = process.env.MAIN_DIRECTORY;

  // Check if MAIN_DIRECTORY is set
  if (!mainDir) {
    return res
      .status(500)
      .json({ error: "MAIN_DIRECTORY is not set in environment variables" });
  }

  // Validate folder and file parameters
  if (typeof folder !== "string" || typeof file !== "string") {
    return res.status(400).json({ error: "Invalid folder or file parameter" });
  }

  // Construct the full file path
  const filePath = path.join(mainDir, folder, file);

  // Check if the file exists and serve it
  if (fs.existsSync(filePath)) {
    // Read the image file
    const imageBuffer = fs.readFileSync(filePath);
    // Determine the content type based on file extension
    const contentType = getContentType(path.extname(file));
    // Set the content type header
    res.setHeader("Content-Type", contentType);
    // Send the image buffer as the response
    res.send(imageBuffer);
  } else {
    // Return 404 if the image is not found
    res.status(404).json({ error: "Image not found" });
  }
}

// Helper function to determine the content type based on file extension
function getContentType(extension: string): string {
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
