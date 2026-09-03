import { useEffect, useMemo, useState } from 'react'
import type { OrganizationMember } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function AddTeamMemberModal({
  open,
  onClose,
  teamName,
  orgMembers,
  existingMemberIds,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  teamName: string
  orgMembers: OrganizationMember[]
  existingMemberIds: string[]
  onAdd: (userId: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelectedId(null)
    setError(null)
  }, [open])

  const existing = useMemo(() => new Set(existingMemberIds), [existingMemberIds])

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orgMembers.filter((member) => {
      if (existing.has(member.id)) return false
      if (!q) return true
      const name = `${member.firstName} ${member.lastName}`.toLowerCase()
      return name.includes(q) || member.email.toLowerCase().includes(q)
    })
  }, [orgMembers, existing, search])

  async function handleAdd() {
    if (!selectedId) return
    setError(null)
    setSubmitting(true)
    try {
      await onAdd(selectedId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add member"
      description={`Add a member to ${teamName}`}
    >
      <div className="space-y-4">
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

        <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
          {candidates.length === 0 ? (
            <p className="px-3 py-4 text-sm text-text-muted">No available members found.</p>
          ) : (
            candidates.map((member) => {
              const name = `${member.firstName} ${member.lastName}`
              const selected = selectedId === member.id
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedId(member.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface ${
                    selected ? 'bg-accent-purple/10' : ''
                  }`}
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleAdd} disabled={!selectedId || submitting}>
            {submitting ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
