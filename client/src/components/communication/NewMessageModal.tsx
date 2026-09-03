import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ApiError, organizationsApi } from '../../lib/api'
import type { OrganizationMember } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function NewMessageModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (userId: string) => Promise<void>
}) {
  const { organization, user } = useAuth()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !organization?.id) return
    setSearch('')
    setError(null)
    setLoading(true)
    organizationsApi
      .listMembers(organization.id)
      .then(setMembers)
      .catch(() => setError('Failed to load members'))
      .finally(() => setLoading(false))
  }, [open, organization?.id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      if (m.id === user?.id) return false
      if (!q) return true
      const name = `${m.firstName} ${m.lastName}`.toLowerCase()
      return name.includes(q) || m.email.toLowerCase().includes(q)
    })
  }, [members, search, user?.id])

  async function handleSelect(userId: string) {
    setSubmitting(userId)
    setError(null)
    try {
      await onSelect(userId)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start conversation')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New message" description="Message a team member">
      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <p className="px-3 py-4 text-sm text-text-muted">Loading members...</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-text-muted">No members found.</p>
          ) : (
            filtered.map((member) => {
              const name = `${member.firstName} ${member.lastName}`
              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => handleSelect(member.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface disabled:opacity-60"
                >
                  <Avatar userId={member.id} name={name} src={member.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{name}</p>
                    <p className="truncate text-xs text-text-muted">{member.email}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
