import { Channel } from '../models/Channel'
import { User } from '../models/User'
import { getSocketIO } from '../socket/socketInstance'
import { getMembershipForUser } from './membershipService'
import type { MembershipRole } from '../models/Membership'
import type { Socket } from 'socket.io'

type AuthenticatedSocket = Socket & {
  data: {
    userId: string
    organizationId: string
    role: MembershipRole
  }
}

export interface TypingUserIdentity {
  userId: string
  firstName: string
  lastName: string
  avatarUrl?: string
}

export async function refreshSocketMembership(
  userId: string,
  organizationId: string
): Promise<{ role: MembershipRole } | null> {
  const membership = await getMembershipForUser(userId, organizationId)
  if (!membership) return null
  return { role: membership.role }
}

export async function getTypingUserIdentity(userId: string): Promise<TypingUserIdentity> {
  const user = await User.findById(userId).select('firstName lastName avatarUrl')
  if (!user) {
    return { userId, firstName: 'Unknown', lastName: '' }
  }
  return {
    userId,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

function forEachUserOrgSocket(
  userId: string,
  organizationId: string,
  fn: (socket: AuthenticatedSocket) => void
) {
  const io = getSocketIO()
  if (!io) return

  for (const socket of io.sockets.sockets.values()) {
    const authSocket = socket as AuthenticatedSocket
    if (
      authSocket.data?.userId === userId &&
      authSocket.data?.organizationId === organizationId
    ) {
      fn(authSocket)
    }
  }
}

export async function evictUserFromTeamChannels(
  orgId: string,
  userId: string,
  teamId: string
): Promise<void> {
  const channels = await Channel.find({
    organizationId: orgId,
    teamId,
    isDeleted: false,
  }).select('_id')

  const channelIds = channels.map((c) => c._id.toString())
  if (channelIds.length === 0) return

  forEachUserOrgSocket(userId, orgId, (socket) => {
    for (const channelId of channelIds) {
      socket.leave(`channel:${channelId}`)
    }
    socket.emit('communication:access-revoked', {
      reason: 'team_removed',
      contextType: 'channel',
      teamId,
      channelIds,
    })
  })
}

export function evictUsersFromTeamChannels(
  orgId: string,
  userIds: string[],
  teamId: string
): Promise<void> {
  const uniqueIds = [...new Set(userIds)]
  return Promise.all(uniqueIds.map((userId) => evictUserFromTeamChannels(orgId, userId, teamId))).then(
    () => undefined
  )
}

export function notifyTeamAccessUpdated(orgId: string, userId: string, teamId: string): void {
  forEachUserOrgSocket(userId, orgId, (socket) => {
    socket.emit('communication:team-access-updated', { teamId, organizationId: orgId })
  })
}

export function evictUserFromOrganization(orgId: string, userId: string): void {
  forEachUserOrgSocket(userId, orgId, (socket) => {
    socket.emit('communication:access-revoked', {
      reason: 'membership_removed',
      contextType: 'organization',
      organizationId: orgId,
    })
    socket.leave(`org:${orgId}`)
    socket.disconnect(true)
  })
}

export function collectTeamAccessibleUserIds(
  memberIds: Array<{ toString(): string }>,
  leadId?: { toString(): string } | null
): Set<string> {
  const ids = new Set(memberIds.map((id) => id.toString()))
  if (leadId) ids.add(leadId.toString())
  return ids
}
