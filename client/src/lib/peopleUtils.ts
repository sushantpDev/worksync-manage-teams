import type { OrganizationMember, Team, UserRole } from '../types'

export interface MemberTeamInfo {
  teamId: string
  teamName: string
  isLead: boolean
}

export function buildMemberTeamsMap(teams: Team[]): Map<string, MemberTeamInfo[]> {
  const map = new Map<string, MemberTeamInfo[]>()

  for (const team of teams) {
    const memberIds = new Set(team.memberIds)
    if (team.leadId) memberIds.add(team.leadId)

    for (const userId of memberIds) {
      const list = map.get(userId) ?? []
      if (list.some((entry) => entry.teamId === team.id)) continue
      list.push({
        teamId: team.id,
        teamName: team.name,
        isLead: team.leadId === userId,
      })
      map.set(userId, list)
    }
  }

  for (const [, list] of map) {
    list.sort((a, b) => a.teamName.localeCompare(b.teamName))
  }

  return map
}

export function matchesPeopleSearch(member: OrganizationMember, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
  return (
    member.firstName.toLowerCase().includes(normalized) ||
    member.lastName.toLowerCase().includes(normalized) ||
    fullName.includes(normalized) ||
    member.email.toLowerCase().includes(normalized)
  )
}

export function matchesRoleFilter(member: OrganizationMember, role: string): boolean {
  if (role === 'all') return true
  return member.role === role
}

export function matchesTeamFilter(
  member: OrganizationMember,
  teamId: string,
  memberTeamsMap: Map<string, MemberTeamInfo[]>
): boolean {
  if (teamId === 'all') return true
  return (memberTeamsMap.get(member.id) ?? []).some((entry) => entry.teamId === teamId)
}

export const roleFilterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
]

export function roleLabel(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}
