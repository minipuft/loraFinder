import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

// Configuration to disable the API response size limit
export const config = {
  api: {
    responseLimit: false,
  },
};

// Main API handler function
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("API route called with query:", req.query);
  const { params } = req.query;
  const mainDirectory = process.env.MAIN_DIRECTORY || "";

  // Remove any 'api' and 'image' parts from the params
  const cleanParams = (params as string[]).filter(
    (param) => param !== "api" && param !== "image"
  );

  // Construct the file path
  const filePath = path.join(mainDirectory, ...cleanParams);

  // Log request details for debugging
  console.log("Requested params:", params);
  console.log("Clean params:", cleanParams);
  console.log("Main directory:", mainDirectory);
  console.log("Requested file path:", filePath);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Read the image file
    const imageBuffer = fs.readFileSync(filePath);
    // Determine the content type
    const contentType = getContentType(filePath);
    console.log("Content-Type:", contentType);
    // Set response headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    // Send the image buffer as the response
    res.send(imageBuffer);
  } else {
    // If the file doesn't exist, return a 404 error
    console.log("File not found:", filePath);
    res.status(404).json({ error: "Image not found" });
  }
}

// Helper function to determine the content type based on file extension
function getContentType(filePath: string): string {
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
