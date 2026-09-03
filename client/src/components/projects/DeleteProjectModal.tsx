import { useEffect, useState } from 'react'
import type { Project } from '../../types'
import { ApiError, projectsApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function DeleteProjectModal({
  open,
  onClose,
  project,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  project: Project | null
  onSuccess: (projectId: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
  }, [open])

  async function handleDelete() {
    if (!project) return

    setError(null)
    setSubmitting(true)

    try {
      await projectsApi.delete(project.id)
      onSuccess(project.id)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete project')
    } finally {
      setSubmitting(false)
    }
  }

  if (!project) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete project"
      description="This action is permanent and cannot be undone."
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-border-subtle bg-card-muted px-4 py-3">
          <p className="text-sm font-medium text-text-primary">{project.name}</p>
          <p className="mt-2 text-xs text-text-secondary">
            All tasks, comments, project activities, and related notifications for this project
            will be permanently deleted.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete project'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
