import { useEffect, useState } from 'react'
import type { OrganizationMember, Team } from '../../types'
import { ApiError, teamsApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { FormSelect } from '../ui/FormSelect'
import { Modal } from '../ui/Modal'

const fieldClass =
  'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20'

export function TeamFormModal({
  open,
  onClose,
  organizationId,
  members,
  team,
  onSuccess,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  organizationId: string
  members: OrganizationMember[]
  team?: Team
  onSuccess: (team: Team) => void
  onDelete?: (teamId: string) => void
}) {
  const isEdit = Boolean(team)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [leadId, setLeadId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return

    if (team) {
      setName(team.name)
      setDescription(team.description ?? '')
      setSelectedMemberIds(team.memberIds ?? [])
      setLeadId(team.leadId ?? '')
    } else {
      setName('')
      setDescription('')
      setSelectedMemberIds([])
      setLeadId('')
    }
    setError(null)
  }, [open, team])

  function toggleMember(memberId: string) {
    const removing = selectedMemberIds.includes(memberId)
    if (removing && leadId === memberId) {
      setLeadId('')
    }
    setSelectedMemberIds((prev) =>
      removing ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const payload = {
      name: name.trim(),
      description: description.trim(),
      memberIds: selectedMemberIds,
      leadId: leadId || undefined,
    }

    try {
      const result = isEdit
        ? await teamsApi.update(organizationId, team!.id, payload)
        : await teamsApi.create(organizationId, payload)
      onSuccess(result)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save team')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!team || !onDelete) return
    setError(null)
    setDeleting(true)

    try {
      await teamsApi.delete(organizationId, team.id)
      onDelete(team.id)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete team')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit team' : 'Create team'}
      description="Add organization members who have accepted their invitation."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Team name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            placeholder="Engineering"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
            placeholder="Optional team description"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium text-text-primary">Members</span>
          {members.length === 0 ? (
            <p className="text-sm text-text-muted">No organization members available yet.</p>
          ) : (
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {members.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="rounded border-border"
                  />
                  <span>{member.firstName} {member.lastName}</span>
                  <span className="text-text-muted">({member.email})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedMemberIds.length > 0 && (
          <FormSelect
            label="Team lead"
            value={leadId}
            placeholder="No lead"
            options={[
              { value: '', label: 'No lead' },
              ...members
                .filter((m) => selectedMemberIds.includes(m.id))
                .map((member) => ({
                  value: member.id,
                  label: `${member.firstName} ${member.lastName}`,
                })),
            ]}
            onChange={setLeadId}
          />
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {isEdit && onDelete ? (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting || submitting}
            >
              {deleting ? 'Deleting...' : 'Delete team'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create team'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
