import {
  AVATAR_ALLOWED_MIME_TYPES,
  AVATAR_MAX_BYTES,
  avatarPublicId,
  getCloudinary,
} from '../config/cloudinary'

export function validateAvatarFile(mimetype: string, size: number): string | null {
  if (!AVATAR_ALLOWED_MIME_TYPES.includes(mimetype as typeof AVATAR_ALLOWED_MIME_TYPES[number])) {
    return 'Please choose a JPG, PNG or WebP image.'
  }
  if (size > AVATAR_MAX_BYTES) {
    return 'Profile photo must be smaller than 5 MB.'
  }
  return null
}

export async function uploadUserAvatar(
  userId: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const cloudinary = getCloudinary()
  const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'worksync/avatars',
    public_id: userId,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:good',
        fetch_format: 'auto',
      },
    ],
  })

  return result.secure_url
}

export async function deleteUserAvatar(userId: string): Promise<void> {
  const cloudinary = getCloudinary()
  try {
    await cloudinary.uploader.destroy(avatarPublicId(userId), {
      invalidate: true,
      resource_type: 'image',
    })
  } catch {
    // Avatar may not exist in Cloudinary (e.g. legacy external URL only).
  }
}
