import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ChevronDown,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import { MobileNavToggle } from '../components/layout/Sidebar'
import { ChangeMemberRoleModal } from '../components/team/ChangeMemberRoleModal'
import { InviteMemberModal } from '../components/team/InviteMemberModal'
import { MemberRowActions } from '../components/team/MemberRowActions'
import { RemoveMemberModal } from '../components/team/RemoveMemberModal'
import { Avatar } from '../components/ui/Avatar'
import { ActionMenuPortal } from '../components/ui/ActionMenuPortal'
import { Button } from '../components/ui/Button'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { orgStorage } from '../lib/orgStorage'
import { ApiError, invitationsApi, organizationsApi, teamsApi } from '../lib/api'
import {
  buildMemberTeamsMap,
  matchesPeopleSearch,
  matchesRoleFilter,
  matchesTeamFilter,
  roleFilterOptions,
  roleLabel,
  type MemberTeamInfo,
} from '../lib/peopleUtils'
import { cn } from '../lib/utils'
import type { Invitation, OrganizationMember, Team } from '../types'

type StatusFilter = 'all' | 'active' | 'invited'

type DirectoryRow =
  | {
      kind: 'member'
      key: string
      member: OrganizationMember
      teams: MemberTeamInfo[]
    }
  | {
      kind: 'invitation'
      key: string
      invitation: Invitation
    }

function formatJoined(date?: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function teamsLabel(teams: MemberTeamInfo[], unavailable?: boolean) {
  if (unavailable) return '—'
  if (teams.length === 0) return 'Not joined'
  return teams.map((t) => (t.isLead ? `${t.teamName} · Lead` : t.teamName)).join(', ')
}

function FilterChip({
  label,
  active,
  count,
  options,
  value,
  onChange,
}: {
  label: string
  active?: boolean
  count?: number
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const showLabel =
    value === 'all' || !selected ? label : `${label}: ${selected.label}`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border bg-[#f5f5f5] px-3.5 text-[13px] font-medium text-[#1a1a1a] transition-colors hover:bg-[#ececec]',
          active || value !== 'all'
            ? 'border-[#1a1a1a] bg-white'
            : 'border-transparent'
        )}
      >
        <span className="max-w-[140px] truncate">{showLabel}</span>
        {typeof count === 'number' && count > 0 ? (
          <span className="ml-0.5 rounded-full bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
        <ChevronDown className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close filter"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[180px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                    opt.value === value
                      ? 'bg-[#f3f4f6] font-semibold text-[#111827]'
                      : 'text-[#374151] hover:bg-[#f9fafb]'
                  )}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: 'active' | 'invited' | Invitation['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[12px] font-medium text-[#047857]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
        Active
      </span>
    )
  }

  if (status === 'invited' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f1ff] px-2.5 py-1 text-[12px] font-medium text-[#1d4ed8]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
        Invited
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[12px] font-medium capitalize text-[#6b7280]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af]" />
      {status}
    </span>
  )
}

export function PeoplePage() {
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()
  const { organization, user, refreshSession } = useAuth()
  const isAdmin = user?.role === 'admin'
  const orgId = organization?.id ?? user?.organizationId ?? orgStorage.getOrganizationId()

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [roleMember, setRoleMember] = useState<OrganizationMember | null>(null)
  const [removeMember, setRemoveMember] = useState<OrganizationMember | null>(null)

  const memberTeamsMap = useMemo(() => buildMemberTeamsMap(teams), [teams])

  const teamFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All teams' },
      ...teams.map((team) => ({ value: team.id, label: team.name })),
    ],
    [teams]
  )

  const statusFilterOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'invited', label: 'Invited' },
  ]

  const pendingInvitations = useMemo(
    () => invitations.filter((inv) => inv.status === 'pending'),
    [invitations]
  )

  const filteredRows = useMemo(() => {
    const rows: DirectoryRow[] = []

    if (statusFilter !== 'invited') {
      for (const member of members) {
        if (
          matchesPeopleSearch(member, searchQuery) &&
          matchesRoleFilter(member, roleFilter) &&
          matchesTeamFilter(member, teamFilter, memberTeamsMap)
        ) {
          rows.push({
            kind: 'member',
            key: member.membershipId ?? member.id,
            member,
            teams: memberTeamsMap.get(member.id) ?? [],
          })
        }
      }
    }

    if (isAdmin && statusFilter !== 'active') {
      const q = searchQuery.trim().toLowerCase()
      for (const invitation of pendingInvitations) {
        if (q && !invitation.email.toLowerCase().includes(q)) continue
        if (roleFilter !== 'all' && invitation.role !== roleFilter) continue
        rows.push({
          kind: 'invitation',
          key: invitation.id,
          invitation,
        })
      }
    }

    return rows
  }, [
    members,
    pendingInvitations,
    searchQuery,
    roleFilter,
    teamFilter,
    statusFilter,
    memberTeamsMap,
    isAdmin,
  ])

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    setTeamsError(null)

    try {
      const membersData = await organizationsApi.listMembers(orgId)
      setMembers(membersData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load people.")
      setMembers([])
      setLoading(false)
      return
    }

    try {
      const teamsData = await teamsApi.list(orgId)
      setTeams(teamsData)
    } catch (err) {
      setTeams([])
      setTeamsError(err instanceof ApiError ? err.message : 'Failed to load teams')
    }

    if (isAdmin) {
      try {
        const invitationData = await invitationsApi.list(orgId)
        setInvitations(invitationData)
      } catch {
        setInvitations([])
      }
    } else {
      setInvitations([])
    }

    setLoading(false)
  }, [orgId, isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleRevoke(invitationId: string) {
    if (!orgId) return
    setRevokingId(invitationId)
    try {
      await invitationsApi.revoke(orgId, invitationId)
      await loadData()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke invitation')
    } finally {
      setRevokingId(null)
    }
  }

  function handleRoleUpdated(updated: OrganizationMember) {
    setMembers((prev) =>
      prev.map((member) =>
        member.membershipId === updated.membershipId ? updated : member
      )
    )
    if (updated.id === user?.id) {
      refreshSession()
    }
  }

  function handleMemberRemoved(membershipId: string) {
    setMembers((prev) => prev.filter((member) => member.membershipId !== membershipId))
  }

  const activeFilterCount =
    (roleFilter !== 'all' ? 1 : 0) +
    (teamFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0)

  return (
    <div className="min-h-full">
      {/* Header — Deel Directory style */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MobileNavToggle
            open={mobileNavOpen}
            onToggle={() => setMobileNavOpen(!mobileNavOpen)}
          />
          <h1 className="text-[1.75rem] font-bold leading-none tracking-tight text-[#111827] sm:text-[2rem]">
            People
          </h1>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add people
            <ChevronDown className="ml-0.5 h-3.5 w-3.5 opacity-70" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {teamsError && !error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Couldn&apos;t load team memberships. People are still shown below.
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading people..." />
      ) : error ? null : (
        <>
          {/* Filter toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {searchOpen || searchQuery ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
                  <input
                    autoFocus
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery.trim()) setSearchOpen(false)
                    }}
                    placeholder="Search people..."
                    className="h-9 w-[200px] rounded-full border border-[#e5e7eb] bg-white pl-9 pr-3 text-[13px] text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#111827]/30 sm:w-[240px]"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] text-[#374151] transition-colors hover:bg-[#ececec]"
                >
                  <Search className="h-4 w-4" strokeWidth={2} />
                </button>
              )}

              <button
                type="button"
                aria-label="Filters"
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] text-[#374151] transition-colors hover:bg-[#ececec]',
                  activeFilterCount > 0 && 'ring-1 ring-[#111827]'
                )}
              >
                <Filter className="h-4 w-4" strokeWidth={2} />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-[#111827] px-1 py-0.5 text-[9px] font-semibold leading-none text-white">
                    {activeFilterCount > 9 ? '9+' : activeFilterCount}
                  </span>
                )}
              </button>

              <FilterChip
                label="Role"
                value={roleFilter}
                options={roleFilterOptions}
                onChange={setRoleFilter}
              />

              {teams.length > 0 && (
                <FilterChip
                  label="Team"
                  value={teamFilter}
                  options={teamFilterOptions}
                  onChange={setTeamFilter}
                />
              )}

              {isAdmin && (
                <FilterChip
                  label="Status"
                  value={statusFilter}
                  options={statusFilterOptions}
                  count={
                    statusFilter === 'invited'
                      ? pendingInvitations.length
                      : statusFilter === 'all' && pendingInvitations.length > 0
                        ? pendingInvitations.length
                        : undefined
                  }
                  active={statusFilter !== 'all'}
                  onChange={(v) => setStatusFilter(v as StatusFilter)}
                />
              )}
            </div>
          </div>

          {/* White card table */}
          <section className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-3.5">
              <p className="text-[13px] text-[#6b7280]">
                Total {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {members.length === 0 && pendingInvitations.length === 0 ? (
              <EmptyState
                title="No people found."
                description={
                  isAdmin
                    ? 'Invite colleagues by email. They will appear here after accepting.'
                    : 'Organization members will appear here.'
                }
                actionLabel={isAdmin ? 'Add people' : undefined}
                onAction={isAdmin ? () => setInviteOpen(true) : undefined}
              />
            ) : filteredRows.length === 0 ? (
              <EmptyState
                title="No people match your filters."
                description="Try adjusting search or filters."
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[880px] table-fixed border-collapse text-left">
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[#f0f0f0]">
                        <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">
                          Person
                        </th>
                        <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">
                          Role
                        </th>
                        <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">
                          Team
                        </th>
                        <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">
                          Status
                        </th>
                        <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">
                          Joined
                        </th>
                        <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        if (row.kind === 'invitation') {
                          const inv = row.invitation
                          const nameFromEmail = inv.email.split('@')[0] ?? inv.email
                          return (
                            <tr
                              key={row.key}
                              className="border-b border-[#f5f5f5] transition-colors hover:bg-[#fafafa] last:border-0"
                            >
                              <td className="px-5 py-4 align-middle">
                                <div className="flex items-center gap-3">
                                  <Avatar name={nameFromEmail} size="md" />
                                  <div className="min-w-0">
                                    <p className="truncate text-[14px] font-medium text-[#2563eb]">
                                      {inv.email}
                                    </p>
                                    <p className="mt-0.5 truncate text-[12px] text-[#9ca3af]">
                                      Pending invite
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 align-middle text-[14px] capitalize text-[#374151]">
                                {roleLabel(inv.role)}
                              </td>
                              <td className="px-5 py-4 align-middle text-[14px] text-[#9ca3af]">
                                —
                              </td>
                              <td className="px-5 py-4 align-middle">
                                <StatusPill status="invited" />
                              </td>
                              <td className="px-5 py-4 align-middle text-[14px] text-[#6b7280]">
                                {formatJoined(inv.createdAt)}
                              </td>
                              <td className="px-5 py-4 align-middle">
                                <div className="flex justify-end">
                                  <div className="relative">
                                    <InvitationRowActions
                                      revoking={revokingId === inv.id}
                                      onRevoke={() => handleRevoke(inv.id)}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        const { member, teams: memberTeams } = row
                        return (
                          <tr
                            key={row.key}
                            className="border-b border-[#f5f5f5] transition-colors hover:bg-[#fafafa] last:border-0"
                          >
                            <td className="px-5 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  userId={member.id}
                                  name={`${member.firstName} ${member.lastName}`}
                                  src={member.avatarUrl}
                                  size="md"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-medium text-[#2563eb]">
                                    {member.firstName} {member.lastName}
                                  </p>
                                  <p className="mt-0.5 truncate text-[12px] text-[#9ca3af]">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 align-middle text-[14px] text-[#374151]">
                              {roleLabel(member.role)}
                            </td>
                            <td className="px-5 py-4 align-middle text-[14px] text-[#374151]">
                              <span className="line-clamp-2">
                                {teamsLabel(memberTeams, Boolean(teamsError))}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <StatusPill status="active" />
                            </td>
                            <td className="px-5 py-4 align-middle text-[14px] text-[#6b7280]">
                              {formatJoined(member.joinedAt)}
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <div className="flex justify-end">
                                {isAdmin && member.membershipId ? (
                                  <MemberRowActions
                                    onChangeRole={() => setRoleMember(member)}
                                    onRemove={() => setRemoveMember(member)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-[#9ca3af]"
                                    aria-label="More"
                                    disabled
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-[#f0f0f0] md:hidden">
                  {filteredRows.map((row) => {
                    if (row.kind === 'invitation') {
                      const inv = row.invitation
                      return (
                        <div key={row.key} className="flex items-start gap-3 px-4 py-4">
                          <Avatar name={inv.email.split('@')[0] ?? inv.email} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#2563eb]">
                                  {inv.email}
                                </p>
                                <p className="mt-0.5 text-xs capitalize text-[#9ca3af]">
                                  {roleLabel(inv.role)}
                                </p>
                              </div>
                              <InvitationRowActions
                                revoking={revokingId === inv.id}
                                onRevoke={() => handleRevoke(inv.id)}
                              />
                            </div>
                            <div className="mt-2">
                              <StatusPill status="invited" />
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const { member, teams: memberTeams } = row
                    return (
                      <div key={row.key} className="flex items-start gap-3 px-4 py-4">
                        <Avatar
                          userId={member.id}
                          name={`${member.firstName} ${member.lastName}`}
                          src={member.avatarUrl}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#2563eb]">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[#9ca3af]">
                                {member.email}
                              </p>
                            </div>
                            {isAdmin && member.membershipId ? (
                              <MemberRowActions
                                onChangeRole={() => setRoleMember(member)}
                                onRemove={() => setRemoveMember(member)}
                              />
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-[#6b7280]">
                              {roleLabel(member.role)}
                            </span>
                            <StatusPill status="active" />
                          </div>
                          <p className="mt-1.5 text-xs text-[#9ca3af]">
                            {teamsLabel(memberTeams, Boolean(teamsError))}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {orgId && (
        <>
          <InviteMemberModal
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            organizationId={orgId}
            onSuccess={loadData}
          />
          <ChangeMemberRoleModal
            open={Boolean(roleMember)}
            onClose={() => setRoleMember(null)}
            organizationId={orgId}
            member={roleMember}
            onSuccess={handleRoleUpdated}
          />
          <RemoveMemberModal
            open={Boolean(removeMember)}
            onClose={() => setRemoveMember(null)}
            organizationId={orgId}
            organizationName={organization?.name}
            member={removeMember}
            onSuccess={handleMemberRemoved}
          />
        </>
      )}
    </div>
  )
}

function InvitationRowActions({
  onRevoke,
  revoking,
}: {
  onRevoke: () => void
  revoking: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <ActionMenuPortal
      open={open}
      onClose={() => setOpen(false)}
      estimatedMenuHeight={56}
      trigger={({ ref }) => (
        <button
          ref={ref}
          type="button"
          aria-label="Invitation actions"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      <button
        type="button"
        role="menuitem"
        disabled={revoking}
        className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
        onClick={() => {
          setOpen(false)
          onRevoke()
        }}
      >
        {revoking ? 'Revoking...' : 'Revoke invite'}
      </button>
    </ActionMenuPortal>
  )
}
