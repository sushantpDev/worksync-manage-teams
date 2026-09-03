import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { AVATAR_ALLOWED_MIME_TYPES, AVATAR_MAX_BYTES } from '../config/cloudinary'

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_ALLOWED_MIME_TYPES.includes(file.mimetype as typeof AVATAR_ALLOWED_MIME_TYPES[number])) {
      cb(null, true)
      return
    }
    cb(new Error('Please choose a JPG, PNG or WebP image.'))
  },
})

export function handleAvatarUpload(req: Request, res: Response, next: NextFunction): void {
  avatarUpload.single('avatar')(req, res, (err: unknown) => {
    if (!err) {
      next()
      return
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Profile photo must be smaller than 5 MB.' })
        return
      }
      res.status(400).json({ error: err.message })
      return
    }

    const message = err instanceof Error ? err.message : 'Invalid upload'
    res.status(400).json({ error: message })
  })
}
