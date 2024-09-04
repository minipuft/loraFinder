import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

/**
 * API handler for retrieving the current main directory.
 * This endpoint returns the path set in the MAIN_DIRECTORY environment variable.
 *
 * @param {NextApiRequest} req - The incoming request object.
 * @param {NextApiResponse} res - The response object.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if the request method is GET
  if (req.method === "GET") {
    try {
      // Retrieve the main directory from environment variables
      const mainDir = process.env.MAIN_DIRECTORY;

      // Validate that MAIN_DIRECTORY is set
      if (!mainDir) {
        throw new Error("MAIN_DIRECTORY is not set in environment variables");
      }

      // Check if the directory exists
      if (fs.existsSync(mainDir)) {
        // If the directory exists, return it in the response
        res.status(200).json({ currentDirectory: mainDir });
      } else {
        // If the directory doesn't exist, return a 404 error
        res.status(404).json({ error: "Main directory not found" });
      }
    } catch (error) {
      // Log any errors that occur during execution
      console.error("Error in getCurrentDirectory:", error);
      // Return a 500 Internal Server Error for any caught exceptions
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    // Handle non-GET requests
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
