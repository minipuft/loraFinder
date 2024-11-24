import express from 'express'
import fs from 'fs'
import path from 'path'
import { ImageInfo } from '../types.js'
import { isImageFile, getImageDimensions } from '../utils/imageUtils.js'

const router = express.Router()

router.get('/images', async (req, res) => {
  const { folder } = req.query

  if (!folder || typeof folder !== "string") {
    return res.status(400).json({ error: "Invalid or missing folder parameter" })
  }

  try {
    const images = await getImages(folder)
    res.status(200).json(images)
  } catch (error) {
    console.error("Error in getImages:", error)
    res.status(500).json({ error: "Failed to fetch images" })
  }
})

async function getImages(folder: string): Promise<ImageInfo[]> {
  const mainDirectory = process.env.MAIN_DIRECTORY || process.cwd()
  const imagesDirectory = path.join(mainDirectory, folder)

  if (!fs.existsSync(imagesDirectory)) {
    throw new Error(`Folder not found: ${imagesDirectory}`)
  }

  const fileNames = fs.readdirSync(imagesDirectory)
  const images: ImageInfo[] = await Promise.all(
    fileNames
      .filter(isImageFile)
      .map(async (fileName) => {
        const id = fileName.replace(/\.[^/.]+$/, "")
        const filePath = path.join(imagesDirectory, fileName)
        const { width, height } = await getImageDimensions(filePath)

        return {
          id,
          src: `/api/image?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(fileName)}`,
          alt: fileName,
          title: fileName,
          width,
          height,
        }
      })
  )

  return images
}

export default router
