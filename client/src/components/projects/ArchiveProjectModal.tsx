import { useEffect, useState } from 'react'
import type { Project } from '../../types'
import { ApiError, projectsApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function ArchiveProjectModal({
  open,
  onClose,
  project,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  project: Project | null
  onSuccess: (updated: Project) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
  }, [open])

  async function handleArchive() {
    if (!project) return

    setError(null)
    setSubmitting(true)

    try {
      const updated = await projectsApi.update(project.id, { status: 'archived' })
      onSuccess(updated)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to archive project')
    } finally {
      setSubmitting(false)
    }
  }

  if (!project) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Archive project"
      description="Archived projects stay in your organization but are hidden from normal active project views."
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
          <p className="mt-1 text-xs text-text-muted">
            You can find this project later using the Archived status filter on the Projects page.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleArchive} disabled={submitting}>
            {submitting ? 'Archiving...' : 'Archive project'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
