import path from 'path'
import {
  getCloudinary,
  isCloudinaryConfigured,
  isImageMimeType,
  TASK_ATTACHMENT_ALLOWED_MIME_TYPES,
  TASK_ATTACHMENT_MAX_BYTES,
  taskAttachmentFolder,
} from '../config/cloudinary'
import { TaskAttachment, type ITaskAttachment } from '../models/TaskAttachment'

export function sanitizeAttachmentFileName(originalName: string): string {
  const base = path.basename(originalName.replace(/\\/g, '/'))
  const sanitized = base.replace(/[^\w.\- ()]/g, '_').trim()
  return sanitized.slice(0, 200) || 'attachment'
}

export function validateTaskAttachmentFile(mimetype: string, size: number): string | null {
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

export async function uploadTaskAttachmentFile(params: {
  orgId: string
  taskId: string
  attachmentId: string
  buffer: Buffer
  mimetype: string
}): Promise<{ fileUrl: string; publicId: string; resourceType: 'image' | 'raw' }> {
  if (!isCloudinaryConfigured()) {
    throw new Error('File upload is not configured')
  }

  const cloudinary = getCloudinary()
  const folder = taskAttachmentFolder(params.orgId, params.taskId)
  const resourceType = isImageMimeType(params.mimetype) ? 'image' : 'raw'
  const dataUri = `data:${params.mimetype};base64,${params.buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: params.attachmentId,
    resource_type: resourceType,
    overwrite: false,
  })

  return {
    fileUrl: result.secure_url,
    publicId: result.public_id,
    resourceType,
  }
}

export async function deleteTaskAttachmentFile(
  attachment: Pick<ITaskAttachment, 'publicId' | 'resourceType'>
): Promise<void> {
  if (!isCloudinaryConfigured()) return

  const cloudinary = getCloudinary()
  await cloudinary.uploader.destroy(attachment.publicId, {
    resource_type: attachment.resourceType,
    invalidate: true,
  })
}

export async function deleteTaskAttachmentsByFilter(filter: {
  organizationId: string
  taskId?: string
  projectId?: string
}): Promise<void> {
  const query: Record<string, unknown> = { organizationId: filter.organizationId }
  if (filter.taskId) query.taskId = filter.taskId
  if (filter.projectId) query.projectId = filter.projectId

  const attachments = await TaskAttachment.find(query)
  if (attachments.length === 0) return

  await Promise.all(
    attachments.map(async (attachment) => {
      try {
        await deleteTaskAttachmentFile(attachment)
      } catch (error) {
        console.error(
          '[attachments] Cloudinary cleanup failed:',
          attachment.publicId,
          (error as Error).message
        )
      }
    })
  )

  await TaskAttachment.deleteMany({ _id: { $in: attachments.map((a) => a._id) } })
}
