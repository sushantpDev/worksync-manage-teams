import { FileText, Image as ImageIcon, MoreHorizontal, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TaskAttachment } from '../../types'
import { ApiError, taskAttachmentsApi } from '../../lib/api'
import { formatDate, formatFileSize } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import {
  TASK_ATTACHMENT_ACCEPT,
  validateTaskAttachmentFile,
} from '../../lib/validation'
import { Button } from '../ui/Button'
import { EmptyState, LoadingState } from '../ui/State'

function fileTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return { Icon: ImageIcon, label: 'IMG' }
  }
  return { Icon: FileText, label: 'FILE' }
}

function AttachmentActions({
  canDelete,
  onDelete,
}: {
  canDelete: boolean
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!canDelete) return null

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Attachment actions"
        className="h-7 w-7"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[8rem] rounded-lg border border-border bg-card py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function AttachmentItem({
  taskId,
  attachment,
  readOnly,
  onDeleted,
  onError,
}: {
  taskId: string
  attachment: TaskAttachment
  readOnly: boolean
  onDeleted: (attachmentId: string) => void
  onError: (message: string) => void
}) {
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const isImage = attachment.mimeType.startsWith('image/')
  const { Icon, label } = fileTypeIcon(attachment.mimeType)
  const uploader = attachment.uploadedBy
  const uploaderName = uploader ? `${uploader.firstName} ${uploader.lastName}` : 'Unknown'

  const canDelete =
    !readOnly &&
    (user?.role === 'admin' ||
      user?.role === 'manager' ||
      uploader?.id === user?.id)

  async function handleDelete() {
    setDeleting(true)
    try {
      await taskAttachmentsApi.delete(taskId, attachment.id)
      onDeleted(attachment.id)
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to delete attachment')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface">
        {isImage ? (
          <img
            src={attachment.fileUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center text-text-muted">
            <Icon className="h-4 w-4" />
            <span className="mt-0.5 text-[9px] font-semibold uppercase">{label}</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{attachment.fileName}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {formatFileSize(attachment.size)} · Added by {uploaderName} ·{' '}
          {formatDate(attachment.createdAt, { month: 'short', day: 'numeric' })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <a
          href={attachment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-2 py-1 text-xs font-medium text-accent-purple hover:bg-accent-purple/5"
        >
          Open
        </a>
        <AttachmentActions
          canDelete={canDelete && !deleting}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}

export function TaskAttachments({
  taskId,
  readOnly = false,
  onCountChange,
}: {
  taskId: string
  readOnly?: boolean
  onCountChange?: (count: number) => void
}) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onCountChangeRef = useRef(onCountChange)
  onCountChangeRef.current = onCountChange

  const loadAttachments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await taskAttachmentsApi.list(taskId)
      setAttachments(data)
      onCountChangeRef.current?.(data.length)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load attachments')
      setAttachments([])
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadAttachments()
  }, [loadAttachments])

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || readOnly) return

    setError(null)
    setUploading(true)

    try {
      const uploaded: TaskAttachment[] = []
      for (const file of Array.from(files)) {
        const validationError = validateTaskAttachmentFile(file)
        if (validationError) {
          setError(validationError)
          continue
        }
        const attachment = await taskAttachmentsApi.upload(taskId, file)
        uploaded.push(attachment)
      }

      if (uploaded.length > 0) {
        setAttachments((prev) => {
          const next = [...uploaded, ...prev]
          onCountChangeRef.current?.(next.length)
          return next
        })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload attachment')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleDeleted(attachmentId: string) {
    setAttachments((prev) => {
      const next = prev.filter((item) => item.id !== attachmentId)
      onCountChangeRef.current?.(next.length)
      return next
    })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Attachments</h3>
        {!readOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={TASK_ATTACHMENT_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              className="h-8 gap-1 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-3.5 w-3.5" />
              {uploading ? 'Uploading...' : 'Add attachment'}
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading attachments..." />
      ) : attachments.length === 0 ? (
        <EmptyState title="No attachments yet" className="py-6" />
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              taskId={taskId}
              attachment={attachment}
              readOnly={readOnly}
              onDeleted={handleDeleted}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  )
}
