import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import { ChangeMemberRoleModal } from '../team/ChangeMemberRoleModal'
import { InviteMemberModal } from '../team/InviteMemberModal'
import { RemoveMemberModal } from '../team/RemoveMemberModal'
import { Avatar } from '../ui/Avatar'
import { EmptyState, LoadingState } from '../ui/State'
import { useAuth } from '../../context/AuthContext'
import { ApiError, organizationsApi } from '../../lib/api'
import { orgStorage } from '../../lib/orgStorage'
import { matchesPeopleSearch, matchesRoleFilter, roleFilterOptions, roleLabel } from '../../lib/peopleUtils'
import { cn } from '../../lib/utils'
import type { OrganizationMember, UserRole } from '../../types'

const BUILTIN_ROLES: {
  id: UserRole
  name: string
  description: string
}[] = [
  {
    id: 'admin',
    name: 'Organization Admin',
    description: 'Full access to organization settings, people, and all projects.',
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Can manage projects, tasks, and team members within assigned scope.',
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Can work on assigned projects and tasks.',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to shared projects and reports.',
  },
]

function RoleFilterChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const showLabel = value === 'all' || !selected ? label : selected.label

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border bg-[#f5f5f5] px-3.5 text-[13px] font-medium text-[#1a1a1a] transition-colors hover:bg-[#ececec]',
          value !== 'all' ? 'border-[#1a1a1a] bg-white' : 'border-transparent'
        )}
      >
        <span className="max-w-[140px] truncate">{showLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[160px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full rounded-lg px-3 py-2 text-left text-[13px]',
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

function orgRoleDisplay(role: UserRole) {
  if (role === 'admin') return 'Organization Admin'
  return roleLabel(role)
}

export function RolesPermissionsPanel({
  onBack,
}: {
  onBack: () => void
}) {
  const { organization, user, refreshSession } = useAuth()
  const isAdmin = user?.role === 'admin'
  const orgId = organization?.id ?? user?.organizationId ?? orgStorage.getOrganizationId()

  const [tab, setTab] = useState<'people' | 'roles'>('people')
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteDefaultRole, setInviteDefaultRole] = useState<UserRole>('admin')
  const [roleMember, setRoleMember] = useState<OrganizationMember | null>(null)
  const [removeMember, setRemoveMember] = useState<OrganizationMember | null>(null)
  const [createRoleHint, setCreateRoleHint] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const data = await organizationsApi.listMembers(orgId)
      setMembers(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load people.")
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const filtered = useMemo(
    () =>
      members.filter(
        (m) => matchesPeopleSearch(m, searchQuery) && matchesRoleFilter(m, roleFilter)
      ),
    [members, searchQuery, roleFilter]
  )

  const allSelected =
    filtered.length > 0 && filtered.every((m) => selected.has(m.membershipId ?? m.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(filtered.map((m) => m.membershipId ?? m.id)))
  }

  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleRoleUpdated(updated: OrganizationMember) {
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === updated.membershipId ? updated : m))
    )
    if (updated.id === user?.id) refreshSession()
  }

  function handleMemberRemoved(membershipId: string) {
    setMembers((prev) => prev.filter((m) => m.membershipId !== membershipId))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(membershipId)
      return next
    })
  }

  return (
    <div className="w-full max-w-[1100px]">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex cursor-pointer items-center gap-2 text-[15px] font-normal text-[#111827] transition-opacity hover:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Back to main settings
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-[#111827]">
            Roles and permissions
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-[#6b7280]">
            Manage roles, permissions, managers and admins for your organization.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setInviteDefaultRole('admin')
                setInviteOpen(true)
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[#111827] bg-white px-4 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#f9fafb]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Invite admin
            </button>
            <button
              type="button"
              onClick={() => setCreateRoleHint(true)}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Create role
            </button>
          </div>
        )}
      </div>

      {createRoleHint && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#4b5563]">
          <p>
            WorkSync uses built-in roles (Admin, Manager, Member, Viewer). Custom roles are not
            available yet — use the Roles tab to review permissions.
          </p>
          <button
            type="button"
            className="shrink-0 text-[#2563eb] hover:underline"
            onClick={() => {
              setCreateRoleHint(false)
              setTab('roles')
            }}
          >
            View roles
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5 flex gap-6 border-b border-[#e8e8e8]">
        {(['people', 'roles'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'relative cursor-pointer pb-3 text-sm font-semibold capitalize transition-colors',
              tab === t ? 'text-[#111827]' : 'text-[#6b7280] hover:text-[#111827]'
            )}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#111827]" />
            )}
          </button>
        ))}
      </div>

      {tab === 'people' ? (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
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
                  className="h-9 w-[220px] rounded-full border border-[#e5e7eb] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#111827]/30"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] text-[#374151] hover:bg-[#ececec]"
              >
                <Search className="h-4 w-4" strokeWidth={2} />
              </button>
            )}

            <RoleFilterChip
              label="Role"
              value={roleFilter}
              options={roleFilterOptions}
              onChange={setRoleFilter}
            />
          </div>

          {loading ? (
            <LoadingState message="Loading people..." />
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No people found."
              description={
                isAdmin
                  ? 'Invite an admin or member to get started.'
                  : 'Organization members will appear here.'
              }
              actionLabel={isAdmin ? 'Invite admin' : undefined}
              onAction={
                isAdmin
                  ? () => {
                      setInviteDefaultRole('admin')
                      setInviteOpen(true)
                    }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#e8e8e8]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#f0f0f0] bg-white">
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-[#d1d5db]"
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-3 py-3 text-[12px] font-medium text-[#9ca3af]" colSpan={1}>
                        <span className="mr-3 text-[#6b7280]">
                          {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
                        </span>
                        Name
                      </th>
                      <th className="px-4 py-3 text-[12px] font-medium text-[#9ca3af]">Roles</th>
                      <th className="px-4 py-3 text-[12px] font-medium text-[#9ca3af]">
                        Scope of access
                      </th>
                      <th className="w-14 px-4 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => {
                      const key = member.membershipId ?? member.id
                      const isChecked = selected.has(key)
                      const isOrgAdmin = member.role === 'admin'
                      return (
                        <tr
                          key={key}
                          className={cn(
                            'border-b border-[#f5f5f5] last:border-0',
                            isChecked ? 'bg-[#f5f3ff]' : 'hover:bg-[#fafafa]'
                          )}
                        >
                          <td className="px-4 py-3.5 align-middle">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOne(key)}
                              className="h-4 w-4 rounded border-[#d1d5db]"
                              aria-label={`Select ${member.firstName}`}
                            />
                          </td>
                          <td className="px-3 py-3.5 align-middle">
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
                          <td className="px-4 py-3.5 align-middle">
                            {isOrgAdmin ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#f3e8ff] px-2 py-1 text-[13px] font-medium text-[#6b21a8]">
                                <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
                                Organization Admin
                              </span>
                            ) : (
                              <span className="text-[14px] text-[#374151]">
                                {orgRoleDisplay(member.role)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            {isOrgAdmin ? (
                              <span className="inline-flex items-center gap-1.5 text-[14px] text-[#374151]">
                                <Building2 className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
                                Organization
                              </span>
                            ) : (
                              <span className="text-[14px] text-[#9ca3af]">Organization</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex justify-end">
                              {isAdmin && member.membershipId ? (
                                <RowMenu
                                  onChangeRole={() => setRoleMember(member)}
                                  onRemove={() => setRemoveMember(member)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg p-2 text-[#d1d5db]"
                                  aria-label="More"
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
            </div>
          )}
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e8e8e8]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0f0f0]">
                <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">Role</th>
                <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">Description</th>
                <th className="px-5 py-3 text-[12px] font-medium text-[#9ca3af]">People</th>
              </tr>
            </thead>
            <tbody>
              {BUILTIN_ROLES.map((role) => {
                const count = members.filter((m) => m.role === role.id).length
                return (
                  <tr key={role.id} className="border-b border-[#f5f5f5] last:border-0">
                    <td className="px-5 py-4 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#111827]">
                        {role.id === 'admin' && (
                          <Building2 className="h-3.5 w-3.5 text-[#6b21a8]" strokeWidth={2} />
                        )}
                        {role.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-[13px] text-[#6b7280]">
                      {role.description}
                    </td>
                    <td className="px-5 py-4 align-middle text-[14px] text-[#374151]">
                      {count}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {orgId && (
        <>
          <InviteMemberModal
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            organizationId={orgId}
            onSuccess={loadMembers}
            defaultRole={inviteDefaultRole}
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

function RowMenu({
  onChangeRole,
  onRemove,
}: {
  onChangeRole: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Actions"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg">
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#f9fafb]"
              onClick={() => {
                setOpen(false)
                onChangeRole()
              }}
            >
              Change role
            </button>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false)
                onRemove()
              }}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}
