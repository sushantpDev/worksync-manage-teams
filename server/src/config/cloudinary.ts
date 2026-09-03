import { v2 as cloudinary } from 'cloudinary'
import { config } from './index'

export const AVATAR_FOLDER = 'worksync/avatars'
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const TASK_ATTACHMENT_FOLDER = 'worksync/tasks'
export const TASK_ATTACHMENT_MAX_BYTES =
  parseInt(process.env.TASK_ATTACHMENT_MAX_SIZE_MB ?? '10', 10) * 1024 * 1024

export const TASK_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
] as const

export type TaskAttachmentMimeType = typeof TASK_ATTACHMENT_ALLOWED_MIME_TYPES[number]

export function taskAttachmentFolder(orgId: string, taskId: string): string {
  return `${TASK_ATTACHMENT_FOLDER}/${orgId}/${taskId}`
}

export const COMMUNICATION_ATTACHMENT_FOLDER = 'worksync/communication'

export function communicationAttachmentFolder(orgId: string, contextId: string): string {
  return `${COMMUNICATION_ATTACHMENT_FOLDER}/${orgId}/${contextId}`
}

export function isImageMimeType(mimetype: string): boolean {
  return mimetype.startsWith('image/')
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
  )
}

export function configureCloudinary(): void {
  if (!isCloudinaryConfigured()) return

  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  })
}

export function getCloudinary() {
  configureCloudinary()
  return cloudinary
}

export function avatarPublicId(userId: string): string {
  return `${AVATAR_FOLDER}/${userId}`
}
