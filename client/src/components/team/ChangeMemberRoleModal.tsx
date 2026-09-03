import { useEffect, useState } from 'react'
import type { OrganizationMember, UserRole } from '../../types'
import { ApiError, organizationsApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { FormSelect } from '../ui/FormSelect'
import { Modal } from '../ui/Modal'

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
]

export function ChangeMemberRoleModal({
  open,
  onClose,
  organizationId,
  member,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  organizationId: string
  member: OrganizationMember | null
  onSuccess: (updated: OrganizationMember) => void
}) {
  const [role, setRole] = useState<UserRole>('member')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !member) return
    setRole(member.role)
    setError(null)
  }, [open, member])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!member?.membershipId) return

    setError(null)
    setSubmitting(true)

    try {
      const result = await organizationsApi.updateMemberRole(
        organizationId,
        member.membershipId,
        role
      )
      onSuccess(result.member)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update role')
    } finally {
      setSubmitting(false)
    }
  }

  if (!member) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change role"
      description={`Update the organization role for ${member.firstName} ${member.lastName}.`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-card-muted px-3 py-2 text-sm text-text-secondary">
          Current role: <span className="font-medium capitalize text-text-primary">{member.role}</span>
        </div>

        <FormSelect
          label="New role"
          value={role}
          options={roleOptions}
          onChange={(v) => setRole(v as UserRole)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || role === member.role}>
            {submitting ? 'Saving...' : 'Save role'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
