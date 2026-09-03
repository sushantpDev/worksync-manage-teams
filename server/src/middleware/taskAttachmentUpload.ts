import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import {
  TASK_ATTACHMENT_ALLOWED_MIME_TYPES,
  TASK_ATTACHMENT_MAX_BYTES,
} from '../config/cloudinary'

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TASK_ATTACHMENT_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (
      TASK_ATTACHMENT_ALLOWED_MIME_TYPES.includes(
        file.mimetype as typeof TASK_ATTACHMENT_ALLOWED_MIME_TYPES[number]
      )
    ) {
      cb(null, true)
      return
    }
    cb(new Error('This file type is not supported.'))
  },
})

export function handleTaskAttachmentUpload(req: Request, res: Response, next: NextFunction): void {
  attachmentUpload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next()
      return
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxMb = Math.round(TASK_ATTACHMENT_MAX_BYTES / (1024 * 1024))
        res.status(400).json({ error: `Attachment must be smaller than ${maxMb} MB.` })
        return
      }
      res.status(400).json({ error: err.message })
      return
    }

    const message = err instanceof Error ? err.message : 'Invalid upload'
    res.status(400).json({ error: message })
  })
}
