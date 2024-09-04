import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { ImageInfo } from "@/types";
import sharp from "sharp";

// Function to check if a file is an image based on its extension
function isImageFile(filename: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  return imageExtensions.includes(path.extname(filename).toLowerCase());
}

/**
 * API handler for retrieving images from a specified folder.
 *
 * @param {NextApiRequest} req - The incoming request object.
 * @param {NextApiResponse} res - The response object.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if the request method is GET
  if (req.method === "GET") {
    const { folder } = req.query;

    // Validate the folder parameter
    if (!folder || typeof folder !== "string") {
      return res
        .status(400)
        .json({ error: "Invalid or missing folder parameter" });
    }

    try {
      // Fetch images from the specified folder
      const images = await getImages(folder);
      res.status(200).json(images);
    } catch (error) {
      // Handle and log any errors
      console.error("Error in getImages:", error);
      res.status(500).json({ error: "Failed to fetch images" });
    }
  } else {
    // Handle non-GET requests
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Function to retrieve image information from a specified folder
async function getImages(folder: string): Promise<ImageInfo[]> {
  // Determine the main directory and construct the full path to the images folder
  const mainDirectory = process.env.MAIN_DIRECTORY || process.cwd();
  const imagesDirectory = path.join(mainDirectory, folder);

  console.log("Attempting to access folder:", imagesDirectory);

  // Check if the folder exists
  if (!fs.existsSync(imagesDirectory)) {
    throw new Error(`Folder not found: ${imagesDirectory}`);
  }

  // Read the contents of the directory
  const fileNames = fs.readdirSync(imagesDirectory);
  // Process each image file and create an array of ImageInfo objects
  const images: ImageInfo[] = await Promise.all(
    fileNames
      .filter(isImageFile) // Filter out non-image files
      .map(async (fileName) => {
        const id = fileName.replace(/\.[^/.]+$/, "");
        const filePath = path.join(imagesDirectory, fileName);
        const { width, height } = await getImageDimensions(filePath);

        return {
          id,
          src: `/api/image/${folder}/${fileName}`, // Construct the API route for the image
          alt: fileName,
          width,
          height,
        };
      })
  );

  return images;
}

// Function to get the dimensions of an image using sharp
async function getImageDimensions(
  filePath: string
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(filePath).metadata();
  return { width: metadata.width || 0, height: metadata.height || 0 };
}
