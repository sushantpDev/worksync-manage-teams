import { useEffect, useState } from 'react'
import type { UserRole } from '../../types'
import { ApiError, invitationsApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { FormSelect } from '../ui/FormSelect'
import { Modal } from '../ui/Modal'

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
]

const fieldClass =
  'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20'

export function InviteMemberModal({
  open,
  onClose,
  organizationId,
  onSuccess,
  defaultRole = 'member',
}: {
  open: boolean
  onClose: () => void
  organizationId: string
  onSuccess: () => void
  defaultRole?: UserRole
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>(defaultRole)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setRole(defaultRole)
    setError(null)
  }, [open, defaultRole])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await invitationsApi.create(organizationId, email.trim(), role)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send invitation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite member"
      description="Send an email invitation. They must accept before joining the organization."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="colleague@company.com"
          />
        </label>

        <FormSelect
          label="Role"
          value={role}
          options={roleOptions}
          onChange={(v) => setRole(v as UserRole)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send invitation'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
