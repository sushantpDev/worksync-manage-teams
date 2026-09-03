export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

export function isValidAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'

export const TASK_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const TASK_ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip'

export function validateAvatarFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return 'Please choose a JPG, PNG or WebP image.'
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Profile photo must be smaller than 5 MB.'
  }
  return null
}

export function validateTaskAttachmentFile(file: File): string | null {
  const allowed = TASK_ATTACHMENT_ACCEPT.split(',')
  if (!allowed.includes(file.type)) {
    return 'This file type is not supported.'
  }
  if (file.size > TASK_ATTACHMENT_MAX_BYTES) {
    return 'Attachment must be smaller than 10 MB.'
  }
  return null
}
