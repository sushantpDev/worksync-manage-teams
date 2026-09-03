import { useEffect, useMemo, useState } from 'react'
import type { OrganizationMember, Project, Team } from '../../types'
import { ApiError, projectsApi } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

function resolvePreviewMembers(
  orgMembers: OrganizationMember[],
  orgTeams: Team[],
  selectedTeamIds: string[],
  selectedMemberIds: string[]
) {
  const memberMap = new Map(orgMembers.map((member) => [member.id, member]))
  const preview = new Map<string, { member: OrganizationMember; sources: string[] }>()

  for (const teamId of selectedTeamIds) {
    const team = orgTeams.find((item) => item.id === teamId)
    if (!team) continue

    for (const memberId of team.memberIds) {
      const member = memberMap.get(memberId)
      if (!member) continue

      const existing = preview.get(memberId)
      if (existing) {
        if (!existing.sources.includes(team.name)) {
          existing.sources.push(team.name)
        }
      } else {
        preview.set(memberId, { member, sources: [team.name] })
      }
    }
  }

  for (const memberId of selectedMemberIds) {
    const member = memberMap.get(memberId)
    if (!member) continue

    const existing = preview.get(memberId)
    if (existing) {
      if (!existing.sources.includes('Individual')) {
        existing.sources.push('Individual')
      }
    } else {
      preview.set(memberId, { member, sources: ['Individual'] })
    }
  }

  return [...preview.values()].sort((a, b) =>
    `${a.member.firstName} ${a.member.lastName}`.localeCompare(
      `${b.member.firstName} ${b.member.lastName}`
    )
  )
}

export function ProjectTeamModal({
  open,
  onClose,
  project,
  orgMembers,
  orgTeams,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  project: Project
  orgMembers: OrganizationMember[]
  orgTeams: Team[]
  onSuccess: (project: Project) => void
}) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    setSelectedTeamIds(project.teamIds ?? [])
    setSelectedMemberIds(project.memberIds ?? [])
    setError(null)
  }, [open, project])

  const previewMembers = useMemo(
    () => resolvePreviewMembers(orgMembers, orgTeams, selectedTeamIds, selectedMemberIds),
    [orgMembers, orgTeams, selectedTeamIds, selectedMemberIds]
  )

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const updated = await projectsApi.updateTeam(project.id, {
        teamIds: selectedTeamIds,
        memberIds: selectedMemberIds,
      })
      onSuccess(updated)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update project team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage project team"
      description="Assign organization teams and individual members to this project."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <span className="mb-2 block text-sm font-medium text-text-primary">Organization teams</span>
          {orgTeams.length === 0 ? (
            <p className="text-sm text-text-muted">No teams available in this organization.</p>
          ) : (
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {orgTeams.map((team) => (
                <label key={team.id} className="flex items-start gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={selectedTeamIds.includes(team.id)}
                    onChange={() => toggleTeam(team.id)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>
                    <span className="font-medium">{team.name}</span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {team.memberIds.length} member{team.memberIds.length === 1 ? '' : 's'}
                      {team.description ? ` · ${team.description}` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-text-primary">
            Individual members
          </span>
          {orgMembers.length === 0 ? (
            <p className="text-sm text-text-muted">No organization members available yet.</p>
          ) : (
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {orgMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="rounded border-border"
                  />
                  <span>
                    {member.firstName} {member.lastName}
                  </span>
                  <span className="text-text-muted">({member.email})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-text-primary">
            Selected project members
          </span>
          {previewMembers.length === 0 ? (
            <p className="text-sm text-text-muted">No members selected yet.</p>
          ) : (
            <div className="space-y-2 rounded-lg border border-border p-3">
              {previewMembers.map(({ member, sources }) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar
                    userId={member.id}
                    name={`${member.firstName} ${member.lastName}`}
                    src={member.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-text-muted">{sources.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save team'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
