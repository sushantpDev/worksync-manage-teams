import { MoreHorizontal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Comment } from '../../types'
import { ApiError, commentsApi } from '../../lib/api'
import { formatRelativeTime } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { EmptyState, LoadingState } from '../ui/State'

const fieldClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20'

function CommentRowActions({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
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

  if (!canEdit && !canDelete) return null

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Comment actions"
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
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-card-muted"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
            >
              Edit
            </button>
          )}
          {canDelete && (
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
          )}
        </div>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  readOnly,
  onUpdated,
  onDeleted,
  onError,
}: {
  comment: Comment
  readOnly: boolean
  onUpdated: (comment: Comment) => void
  onDeleted: (commentId: string) => void
  onError: (message: string) => void
}) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)

  const author = comment.author
  const isAuthor = user?.id === comment.authorId
  const canEdit = !readOnly && isAuthor
  const canDelete = !readOnly && (isAuthor || user?.role === 'admin')

  async function handleSave() {
    const trimmed = editContent.trim()
    if (!trimmed) {
      onError('Comment cannot be empty')
      return
    }

    setSaving(true)
    try {
      const updated = await commentsApi.update(comment.id, { content: trimmed })
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to update comment')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await commentsApi.delete(comment.id)
      onDeleted(comment.id)
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to delete comment')
    }
  }

  return (
    <div className="flex gap-3">
      {author && (
        <Avatar
          userId={author.id}
          name={`${author.firstName} ${author.lastName}`}
          src={author.avatarUrl}
          size="sm"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {author?.firstName} {author?.lastName}
              </span>
              <span className="text-[10px] text-text-muted">
                {formatRelativeTime(comment.createdAt)}
                {comment.updatedAt && comment.updatedAt !== comment.createdAt && ' (edited)'}
              </span>
            </div>
          </div>
          <CommentRowActions
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={() => {
              setEditContent(comment.content)
              setEditing(true)
            }}
            onDelete={handleDelete}
          />
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              className={fieldClass}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setEditing(false)
                  setEditContent(comment.content)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={saving || !editContent.trim()}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{comment.content}</p>
        )}
      </div>
    </div>
  )
}

function CommentComposer({
  content,
  onChange,
  onSubmit,
  submitting,
  placeholder,
  compact,
}: {
  content: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  placeholder: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <form onSubmit={onSubmit} className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
          className={`${fieldClass} min-h-[2.5rem] resize-none`}
          placeholder={placeholder}
        />
        <Button type="submit" variant="primary" size="sm" disabled={submitting || !content.trim()}>
          {submitting ? 'Sending...' : 'Send'}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-text-primary">Add a comment</span>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={fieldClass}
          placeholder={placeholder}
        />
      </label>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={submitting || !content.trim()}>
          {submitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  )
}

export function CommentsSection({
  projectId,
  taskId,
  readOnly = false,
  compact = false,
  composerPosition = 'top',
  onCommentAdded,
  onCountChange,
}: {
  projectId: string
  taskId?: string
  readOnly?: boolean
  compact?: boolean
  composerPosition?: 'top' | 'bottom'
  onCommentAdded?: () => void
  onCountChange?: (count: number) => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const onCountChangeRef = useRef(onCountChange)
  onCountChangeRef.current = onCountChange

  const notifyCount = useCallback((next: Comment[]) => {
    onCountChangeRef.current?.(next.length)
  }, [])

  const loadComments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: Record<string, string> = { projectId }
      if (taskId) params.taskId = taskId
      const data = await commentsApi.list(params)
      setComments(data)
      notifyCount(data)
    } catch (err) {
      setComments([])
      notifyCount([])
      setError(err instanceof ApiError ? err.message : 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [projectId, taskId, notifyCount])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    setSubmitting(true)
    setActionError(null)

    try {
      const payload = taskId
        ? { projectId, taskId, content: trimmed }
        : { projectId, content: trimmed }
      const created = await commentsApi.create(payload)
      const next = [created, ...comments]
      setComments(next)
      notifyCount(next)
      setContent('')
      onCommentAdded?.()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  function handleUpdated(updated: Comment) {
    const next = comments.map((c) => (c.id === updated.id ? updated : c))
    setComments(next)
  }

  function handleDeleted(commentId: string) {
    const next = comments.filter((c) => c.id !== commentId)
    setComments(next)
    notifyCount(next)
  }

  const composer = !readOnly ? (
    <CommentComposer
      content={content}
      onChange={setContent}
      onSubmit={handleSubmit}
      submitting={submitting}
      placeholder={compact ? 'Write a comment...' : 'Share an update with your team...'}
      compact={compact}
    />
  ) : null

  const emptyMessage = compact ? 'No comments yet' : 'No comments yet. Be the first to comment.'

  return (
    <div>
      {actionError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {composerPosition === 'top' && composer && <div className="mb-5">{composer}</div>}

      {loading && <LoadingState message="Loading comments..." />}

      {!loading && error && (
        <EmptyState
          title="Could not load comments"
          description={error}
          actionLabel="Try again"
          onAction={loadComments}
          className="py-8"
        />
      )}

      {!loading && !error && comments.length === 0 && (
        <p className="text-sm text-text-secondary">{emptyMessage}</p>
      )}

      {!loading && !error && comments.length > 0 && (
        <div className={compact ? 'mb-4 space-y-4' : 'space-y-4'}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              readOnly={readOnly}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onError={setActionError}
            />
          ))}
        </div>
      )}

      {composerPosition === 'bottom' && composer && <div className="mt-4 border-t border-border-subtle pt-4">{composer}</div>}
    </div>
  )
}
