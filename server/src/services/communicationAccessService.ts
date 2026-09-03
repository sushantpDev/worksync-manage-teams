import mongoose from 'mongoose'
import { Team, type ITeam } from '../models/Team'
import type { MembershipRole } from '../models/Membership'
import { Channel, type IChannel } from '../models/Channel'
import { Conversation, type IConversation } from '../models/Conversation'

export function getRole(membershipRole?: MembershipRole, fallback?: MembershipRole): MembershipRole {
  return membershipRole ?? fallback ?? 'member'
}

export async function getAccessibleTeam(
  orgId: string,
  teamId: string,
  userId: string,
  role: MembershipRole
): Promise<ITeam | null> {
  const team = await Team.findOne({ _id: teamId, organizationId: orgId })
  if (!team) return null

  if (role === 'admin') return team

  const userObjectId = new mongoose.Types.ObjectId(userId)
  const isMember =
    team.memberIds.some((id) => id.equals(userObjectId)) ||
    (team.leadId && team.leadId.equals(userObjectId))

  return isMember ? team : null
}

export async function listAccessibleTeams(orgId: string, userId: string, role: MembershipRole) {
  const filter: Record<string, unknown> = { organizationId: orgId }
  if (role !== 'admin') {
    const userObjectId = new mongoose.Types.ObjectId(userId)
    filter.$or = [{ memberIds: userObjectId }, { leadId: userObjectId }]
  }
  return Team.find(filter).sort({ name: 1 })
}

export async function getAccessibleChannel(
  orgId: string,
  channelId: string,
  userId: string,
  role: MembershipRole
): Promise<IChannel | null> {
  const channel = await Channel.findOne({
    _id: channelId,
    organizationId: orgId,
    isDeleted: false,
  })
  if (!channel) return null

  const team = await getAccessibleTeam(orgId, channel.teamId.toString(), userId, role)
  return team ? channel : null
}

export async function getAccessibleConversation(
  orgId: string,
  conversationId: string,
  userId: string
): Promise<IConversation | null> {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    organizationId: orgId,
  })
  if (!conversation) return null

  const isParticipant = conversation.participantIds.some((id) => id.toString() === userId)
  return isParticipant ? conversation : null
}

export function canMutateCommunication(role: MembershipRole): boolean {
  return role !== 'viewer'
}

export function canManageChannels(role: MembershipRole): boolean {
  return role === 'admin' || role === 'manager'
}
