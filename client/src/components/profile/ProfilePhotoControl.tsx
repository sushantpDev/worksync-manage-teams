import { useRef, useState } from 'react'
import { Avatar } from '../ui/Avatar'
import { ApiError, authApi } from '../../lib/api'
import { AVATAR_ACCEPT, validateAvatarFile } from '../../lib/validation'

export function ProfilePhotoControl({
  userId,
  name,
  avatarUrl,
  onUpdated,
}: {
  userId?: string
  name: string
  avatarUrl?: string
  onUpdated: () => Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displaySrc = previewUrl ?? avatarUrl
  const hasAvatar = Boolean(avatarUrl || previewUrl)
  const busy = uploading || removing

  function openFilePicker() {
    if (busy) return
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)

    const validationError = validateAvatarFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setUploading(true)

    try {
      await authApi.uploadAvatar(file)
      setPreviewUrl(null)
      URL.revokeObjectURL(localPreview)
      await onUpdated()
    } catch (err) {
      URL.revokeObjectURL(localPreview)
      setPreviewUrl(null)
      setError(err instanceof ApiError ? err.message : 'Failed to upload profile photo')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!avatarUrl || busy) return

    setError(null)
    setRemoving(true)

    try {
      await authApi.deleteAvatar()
      setPreviewUrl(null)
      await onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove profile photo')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openFilePicker}
          disabled={busy}
          className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-accent-purple/30 disabled:cursor-not-allowed"
          aria-label="Change profile photo"
        >
          <Avatar
            userId={userId}
            name={name}
            src={displaySrc}
            size="lg"
            loading={uploading}
          />
        </button>

        <div className="min-w-0">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={busy}
            className="text-sm font-medium text-text-primary hover:text-accent-purple disabled:opacity-60"
          >
            {uploading ? 'Uploading...' : 'Change photo'}
          </button>
          <p className="mt-1 text-[11px] text-text-muted">JPG, PNG or WebP · Max 5MB</p>
          {hasAvatar && avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="mt-2 text-xs text-text-muted hover:text-red-600 disabled:opacity-60"
            >
              {removing ? 'Removing...' : 'Remove photo'}
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
