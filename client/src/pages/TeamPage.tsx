import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { MobileNavToggle } from '../components/layout/Sidebar'
import { ManageTeamMembersModal } from '../components/team/ManageTeamMembersModal'
import { TeamFormModal } from '../components/team/TeamFormModal'
import { TeamCard } from '../components/team/TeamCard'
import { Button } from '../components/ui/Button'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { orgStorage } from '../lib/orgStorage'
import { canManageTeamMembers } from '../lib/permissions'
import { ApiError, organizationsApi, teamsApi } from '../lib/api'
import type { OrganizationMember, Team } from '../types'

export function TeamPage() {
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()
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
      (team) =>
        team.memberIds.includes(user.id) || team.leadId === user.id
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
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <MobileNavToggle
            open={mobileNavOpen}
            onToggle={() => setMobileNavOpen(!mobileNavOpen)}
          />
          <div>
            <h1 className="text-[2rem] font-bold leading-tight text-[#07111f]">
              Team
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Shape ownership, organize departments, and keep member access clear.
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button size="md" className="rounded-full px-4" onClick={openCreateTeam}>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading team..." />
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
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
