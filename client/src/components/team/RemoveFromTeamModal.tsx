import { useEffect, useState } from 'react'
import type { TeamMemberRow } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function RemoveFromTeamModal({
  open,
  onClose,
  teamName,
  member,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  teamName: string
  member: TeamMemberRow | null
  onConfirm: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
  }, [open])

  if (!member) return null

  const name = `${member.firstName} ${member.lastName}`

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Remove from team?`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Remove <span className="font-medium text-text-primary">{name}</span> from{' '}
          <span className="font-medium text-text-primary">{teamName}</span>?
        </p>
        <p className="text-sm text-text-secondary">
          They will lose access to this team&apos;s channels and team-specific work, but will remain a
          member of the organization.
        </p>
        {member.isLead && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {name} is the Team Lead. Removing them will also clear the Team Lead assignment.
          </p>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Removing...' : 'Remove from team'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
