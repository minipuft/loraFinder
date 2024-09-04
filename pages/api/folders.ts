import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if the request method is GET
  if (req.method === "GET") {
    try {
      // Determine the folder path to scan
      const folderPath =
        process.env.MAIN_DIRECTORY ||
        path.join(process.cwd(), "public", "images");
      console.log("Scanning directory:", folderPath); // Log the directory being scanned for debugging

      // Read the contents of the directory and process the folders
      const folders = fs
        .readdirSync(folderPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory()) // Filter to include only directories
        .map((dirent) => ({
          name: dirent.name,
          path: path.join(folderPath, dirent.name).replace(/\\/g, "/"), // Create path with forward slashes for consistency
        }));

      // Send the list of folders as a JSON response
      res.status(200).json(folders);
    } catch (error) {
      // Log and handle any errors that occur during folder reading
      console.error("Error reading folders:", error);
      res.status(500).json({
        error: "Failed to read folders",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    // Handle non-GET requests
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
