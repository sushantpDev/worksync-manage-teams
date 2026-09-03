import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OrganizationMember, Team, TeamMemberRow } from '../../types'
import { ApiError, teamsApi } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { AddTeamMemberModal } from './AddTeamMemberModal'
import { RemoveFromTeamModal } from './RemoveFromTeamModal'
import { TeamMemberRowActions } from './TeamMemberRowActions'

function buildMemberRows(team: Team): TeamMemberRow[] {
  const leadId = team.leadId
  return (team.members ?? []).map((member) => ({
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: '',
    avatarUrl: member.avatarUrl,
    isLead: member.id === leadId,
  }))
}

function memberRoleLabel(member: TeamMemberRow, orgRole?: OrganizationMember['role']) {
  if (member.isLead) return 'Team Lead'
  if (orgRole === 'admin') return 'Admin'
  return 'Member'
}

export function TeamMembersPanel({
  organizationId,
  team,
  orgMembers,
  canManage,
  enabled,
  refreshKey = 0,
  onTeamUpdated,
}: {
  organizationId: string
  team: Team
  orgMembers: OrganizationMember[]
  canManage: boolean
  enabled: boolean
  refreshKey?: number
  onTeamUpdated?: (team: Team) => void
}) {
  const [currentTeam, setCurrentTeam] = useState<Team>(team)
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const emailByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of orgMembers) {
      map.set(member.id, member.email)
    }
    return map
  }, [orgMembers])

  const orgRoleByUserId = useMemo(() => {
    const map = new Map<string, OrganizationMember['role']>()
    for (const member of orgMembers) {
      map.set(member.id, member.role)
    }
    return map
  }, [orgMembers])

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await teamsApi.listMembers(organizationId, team.id)
      setMembers(
        data.members.map((row) => ({
          ...row,
          email: row.email || emailByUserId.get(row.id) || '',
        }))
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load team members.")
    } finally {
      setLoading(false)
    }
  }, [organizationId, team.id, emailByUserId])

  useEffect(() => {
    setCurrentTeam(team)
    setMembers(
      buildMemberRows(team).map((row) => ({
        ...row,
        email: emailByUserId.get(row.id) || '',
      }))
    )
  }, [team, emailByUserId])

  useEffect(() => {
    if (!enabled) return
    loadMembers()
  }, [enabled, loadMembers, refreshKey])

  function applyTeamUpdate(updated: Team) {
    setCurrentTeam(updated)
    setMembers(
      buildMemberRows(updated).map((row) => ({
        ...row,
        email: emailByUserId.get(row.id) || row.email,
      }))
    )
    onTeamUpdated?.(updated)
    loadMembers()
  }

  async function handleAddMember(userId: string) {
    const updated = await teamsApi.addMember(organizationId, team.id, userId)
    applyTeamUpdate(updated)
  }

  async function handleMakeLead(member: TeamMemberRow) {
    setActionLoading(true)
    setError(null)
    try {
      const updated = await teamsApi.updateLead(organizationId, team.id, member.id)
      applyTeamUpdate(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update team lead')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveLead() {
    setActionLoading(true)
    setError(null)
    try {
      const updated = await teamsApi.updateLead(organizationId, team.id, null)
      applyTeamUpdate(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove team lead')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveFromTeam() {
    if (!removeTarget) return
    const updated = await teamsApi.removeMember(organizationId, team.id, removeTarget.id)
    applyTeamUpdate(updated)
  }

  const lead =
    members.find((m) => m.isLead) ??
    (currentTeam.lead
      ? {
          id: currentTeam.lead.id,
          firstName: currentTeam.lead.firstName,
          lastName: currentTeam.lead.lastName,
          email: emailByUserId.get(currentTeam.lead.id) || '',
          avatarUrl: currentTeam.lead.avatarUrl,
          isLead: true,
        }
      : null)

  return (
    <>
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            {!loading && (
              <button
                type="button"
                className="mt-1 text-sm font-medium underline"
                onClick={() => loadMembers()}
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Team lead</p>
          {lead ? (
            <div className="mt-2 flex items-center gap-3">
              <Avatar
                userId={lead.id}
                name={`${lead.firstName} ${lead.lastName}`}
                src={lead.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {lead.firstName} {lead.lastName}
                </p>
                <p className="text-xs text-text-muted">Team Lead</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-muted">No team lead assigned</p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              Members · {loading && members.length === 0 ? '…' : members.length}
            </h3>
            {canManage && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                + Add member
              </Button>
            )}
          </div>

          {loading && members.length === 0 ? (
            <p className="text-sm text-text-muted">Loading members...</p>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm text-text-secondary">No members yet</p>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setAddOpen(true)}
                >
                  + Add member
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar
                    userId={member.id}
                    name={`${member.firstName} ${member.lastName}`}
                    src={member.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {member.firstName} {member.lastName}
                    </p>
                    {member.email && (
                      <p className="truncate text-xs text-text-muted">{member.email}</p>
                    )}
                  </div>
                  <Badge variant="default">
                    {memberRoleLabel(member, orgRoleByUserId.get(member.id))}
                  </Badge>
                  {canManage && (
                    <TeamMemberRowActions
                      isLead={member.isLead}
                      onMakeLead={member.isLead ? undefined : () => handleMakeLead(member)}
                      onRemoveLead={member.isLead ? handleRemoveLead : undefined}
                      onRemoveFromTeam={() => setRemoveTarget(member)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {actionLoading && <p className="text-xs text-text-muted">Updating team...</p>}
      </div>

      {canManage && (
        <>
          <AddTeamMemberModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            teamName={currentTeam.name}
            orgMembers={orgMembers}
            existingMemberIds={currentTeam.memberIds}
            onAdd={handleAddMember}
          />

          <RemoveFromTeamModal
            open={Boolean(removeTarget)}
            onClose={() => setRemoveTarget(null)}
            teamName={currentTeam.name}
            member={removeTarget}
            onConfirm={handleRemoveFromTeam}
          />
        </>
      )}
    </>
  )
}
