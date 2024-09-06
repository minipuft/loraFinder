import express from 'express'
import fs from 'fs'
import path from 'path'

const router = express.Router()

router.get('/folders', (req, res) => {
  const mainDir = process.env.MAIN_DIRECTORY || path.join(process.cwd(), 'public', 'images')
  
  try {
    const folders = fs.readdirSync(mainDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => ({
        name: dirent.name,
        path: path.join(mainDir, dirent.name).replace(/\\/g, '/')
      }))
    
    res.json(folders)
  } catch (error) {
    console.error('Error reading folders:', error)
    res.status(500).json({ error: 'Failed to read folders' })
  }
})

export default router
