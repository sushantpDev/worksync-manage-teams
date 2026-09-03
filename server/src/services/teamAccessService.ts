import type { MembershipRole } from '../models/Membership'
import { getMembershipForUser } from './membershipService'

export function canManageTeamMembers(role?: MembershipRole): boolean {
  return role === 'admin' || role === 'manager'
}

export async function requireTeamManagementAccess(
  userId: string,
  orgId: string
): Promise<{ role: MembershipRole } | null> {
  const membership = await getMembershipForUser(userId, orgId)
  if (!membership || !canManageTeamMembers(membership.role)) {
    return null
  }
  return { role: membership.role }
}
