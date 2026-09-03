import path from 'path'
import {
  communicationAttachmentFolder,
  getCloudinary,
  isCloudinaryConfigured,
  isImageMimeType,
  TASK_ATTACHMENT_ALLOWED_MIME_TYPES,
  TASK_ATTACHMENT_MAX_BYTES,
} from '../config/cloudinary'

export function sanitizeAttachmentFileName(originalName: string): string {
  const base = path.basename(originalName.replace(/\\/g, '/'))
  const sanitized = base.replace(/[^\w.\- ()]/g, '_').trim()
  return sanitized.slice(0, 200) || 'attachment'
}

export function buildAttachmentContentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') || 'attachment'
  const encoded = encodeURIComponent(fileName)
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}

export function validateCommunicationAttachmentFile(mimetype: string, size: number): string | null {
  if (
    !TASK_ATTACHMENT_ALLOWED_MIME_TYPES.includes(
      mimetype as typeof TASK_ATTACHMENT_ALLOWED_MIME_TYPES[number]
    )
  ) {
    return 'This file type is not supported.'
  }
  if (size > TASK_ATTACHMENT_MAX_BYTES) {
    const maxMb = Math.round(TASK_ATTACHMENT_MAX_BYTES / (1024 * 1024))
    return `Attachment must be smaller than ${maxMb} MB.`
  }
  return null
}

export async function uploadCommunicationAttachment(params: {
  orgId: string
  contextId: string
  attachmentId: string
  buffer: Buffer
  mimetype: string
}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('File upload is not configured')
  }

  const cloudinary = getCloudinary()
  const folder = communicationAttachmentFolder(params.orgId, params.contextId)
  const resourceType = isImageMimeType(params.mimetype) ? 'image' : 'raw'
  const dataUri = `data:${params.mimetype};base64,${params.buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: params.attachmentId,
    resource_type: resourceType,
    overwrite: false,
  })

  return {
    fileName: '',
    fileUrl: result.secure_url,
    publicId: result.public_id,
    resourceType: resourceType as 'image' | 'raw',
    mimeType: params.mimetype,
    size: params.buffer.length,
  }
}

export async function deleteCommunicationAttachment(publicId: string, resourceType: 'image' | 'raw') {
  if (!isCloudinaryConfigured()) return
  const cloudinary = getCloudinary()
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true })
}
