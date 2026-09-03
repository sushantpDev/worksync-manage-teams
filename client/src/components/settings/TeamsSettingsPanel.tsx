import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { ManageTeamMembersModal } from '../team/ManageTeamMembersModal'
import { TeamFormModal } from '../team/TeamFormModal'
import { TeamCard } from '../team/TeamCard'
import { Button } from '../ui/Button'
import { EmptyState, LoadingState } from '../ui/State'
import { useAuth } from '../../context/AuthContext'
import { orgStorage } from '../../lib/orgStorage'
import { canManageTeamMembers } from '../../lib/permissions'
import { ApiError, organizationsApi, teamsApi } from '../../lib/api'
import type { OrganizationMember, Team } from '../../types'

export function TeamsSettingsPanel({ onBack }: { onBack: () => void }) {
  const { organization, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canManageTeams = canManageTeamMembers(user?.role)
  const orgId = organization?.id ?? user?.organizationId ?? orgStorage.getOrganizationId()

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | undefined>()
  const [managingTeam, setManagingTeam] = useState<Team | null>(null)

  const visibleTeams = useMemo(() => {
    if (canManageTeams || !user?.id) return teams
    return teams.filter(
      (team) => team.memberIds.includes(user.id) || team.leadId === user.id
    )
  }, [teams, canManageTeams, user?.id])

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)

    try {
      const [membersData, teamsData] = await Promise.all([
        organizationsApi.listMembers(orgId),
        teamsApi.list(orgId),
      ])
      setMembers(membersData)
      setTeams(teamsData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load team data')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openCreateTeam() {
    setEditingTeam(undefined)
    setTeamModalOpen(true)
  }

  function openEditTeam(team: Team) {
    setEditingTeam(team)
    setTeamModalOpen(true)
  }

  function handleTeamUpdated(team: Team) {
    setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)))
  }

  return (
    <div className="w-full max-w-[1100px]">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[#6b7280] transition-colors hover:text-[#111827]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to main settings
      </button>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-[#111827]">Teams</h1>
          <p className="mt-1.5 text-[15px] text-[#6b7280]">
            Define how your organization is structured across WorkSync.
          </p>
        </div>

        {isAdmin && (
          <Button size="md" className="rounded-full px-4" onClick={openCreateTeam}>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <LoadingState message="Loading teams..." />
        ) : visibleTeams.length === 0 ? (
          <EmptyState
            title={isAdmin ? 'No teams yet' : 'No teams assigned'}
            description={
              isAdmin
                ? 'Create a team and assign organization members.'
                : 'You are not assigned to any team yet. Contact your admin if this looks wrong.'
            }
            actionLabel={isAdmin ? 'Create team' : undefined}
            onAction={isAdmin ? openCreateTeam : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleTeams.map((team, index) => (
              <TeamCard
                key={team.id}
                team={team}
                index={index}
                interactive={isAdmin}
                canManageMembers={canManageTeams}
                onClick={isAdmin ? () => openEditTeam(team) : undefined}
                onManageMembers={canManageTeams ? () => setManagingTeam(team) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {orgId && (
        <>
          <TeamFormModal
            open={teamModalOpen}
            onClose={() => setTeamModalOpen(false)}
            organizationId={orgId}
            members={members}
            team={editingTeam}
            onSuccess={(team) => {
              setTeams((prev) => {
                const idx = prev.findIndex((t) => t.id === team.id)
                if (idx >= 0) {
                  const next = [...prev]
                  next[idx] = team
                  return next
                }
                return [team, ...prev]
              })
              loadData()
            }}
            onDelete={(teamId) => {
              setTeams((prev) => prev.filter((t) => t.id !== teamId))
              loadData()
            }}
          />
          <ManageTeamMembersModal
            open={Boolean(managingTeam)}
            onClose={() => setManagingTeam(null)}
            organizationId={orgId}
            team={managingTeam}
            orgMembers={members}
            onTeamUpdated={handleTeamUpdated}
          />
        </>
      )}
    </div>
  )
}
