import { useEffect, useState } from 'react'
import type { OrganizationMember } from '../../types'
import { ApiError, organizationsApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function RemoveMemberModal({
  open,
  onClose,
  organizationId,
  organizationName,
  member,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  organizationId: string
  organizationName?: string
  member: OrganizationMember | null
  onSuccess: (membershipId: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
  }, [open])

  async function handleRemove() {
    if (!member?.membershipId) return

    setError(null)
    setSubmitting(true)

    try {
      await organizationsApi.removeMember(organizationId, member.membershipId)
      onSuccess(member.membershipId)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove from organization')
    } finally {
      setSubmitting(false)
    }
  }

  if (!member) return null

  const orgLabel = organizationName?.trim() || 'this organization'
  const memberName = `${member.firstName} ${member.lastName}`.trim()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove from organization"
      description="This person will lose access to the organization immediately."
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-border-subtle bg-card-muted px-4 py-3">
          <p className="text-sm font-medium text-text-primary">{memberName}</p>
          <p className="mt-0.5 text-xs text-text-muted">{member.email}</p>
          <p className="mt-2 text-xs text-text-secondary capitalize">Role: {member.role}</p>
        </div>

        <p className="text-sm text-text-secondary">
          Remove {memberName} from {orgLabel}? They will lose access to this organization, its
          teams, projects, and communication.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleRemove}
            disabled={submitting}
          >
            {submitting ? 'Removing...' : 'Remove from organization'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
