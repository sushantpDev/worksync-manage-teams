import mongoose from 'mongoose'
import { Channel } from '../models/Channel'
import type { IConversation } from '../models/Conversation'
import type { IMessageMention } from '../models/Message'
import { Membership } from '../models/Membership'
import { Team } from '../models/Team'
import type { MembershipRole } from '../models/Membership'
import {
  getAccessibleChannel,
  getAccessibleTeam,
  getRole,
} from './communicationAccessService'
import { getMembershipForUser } from './membershipService'
import { notifyUsers } from './notificationService'
import { User } from '../models/User'

export interface RawMessageMention {
  userId: string
  displayName: string
  start: number
  end: number
}

function parseRawMentions(input: unknown): RawMessageMention[] {
  if (!Array.isArray(input)) return []
  const results: RawMessageMention[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const userId = String((item as RawMessageMention).userId ?? '').trim()
    const displayName = String((item as RawMessageMention).displayName ?? '').trim()
    const start = Number((item as RawMessageMention).start)
    const end = Number((item as RawMessageMention).end)
    if (!userId || !displayName || !Number.isFinite(start) || !Number.isFinite(end)) continue
    if (start < 0 || end <= start) continue
    results.push({ userId, displayName, start, end })
  }
  return results
}

function mentionToken(displayName: string) {
  return `@${displayName}`
}

function contentMatchesMention(content: string, mention: RawMessageMention): boolean {
  const slice = content.slice(mention.start, mention.end)
  return slice === mentionToken(mention.displayName)
}

export async function filterValidChannelMentionUserIds(params: {
  orgId: string
  channelId: string
  senderId: string
  userIds: string[]
}): Promise<Set<string>> {
  const channel = await Channel.findOne({
    _id: params.channelId,
    organizationId: params.orgId,
    isDeleted: false,
  })
  if (!channel) return new Set()

  const teamId = channel.teamId.toString()
  const valid = new Set<string>()

  for (const userId of params.userIds) {
    if (!userId || userId === params.senderId) continue
    if (!mongoose.Types.ObjectId.isValid(userId)) continue

    const membership = await getMembershipForUser(userId, params.orgId)
    if (!membership) continue

    const role = getRole(membership.role)
    const team = await getAccessibleTeam(params.orgId, teamId, userId, role)
    if (team) valid.add(userId)
  }

  return valid
}

export function filterValidDirectMentionUserIds(params: {
  conversation: IConversation
  senderId: string
  userIds: string[]
}): Set<string> {
  const participantIds = new Set(params.conversation.participantIds.map((id) => id.toString()))
  const valid = new Set<string>()

  for (const userId of params.userIds) {
    if (!userId || userId === params.senderId) continue
    if (participantIds.has(userId)) valid.add(userId)
  }

  return valid
}

export function normalizeMessageMentions(
  content: string,
  rawInput: unknown,
  validUserIds: Set<string>
): IMessageMention[] {
  const raw = parseRawMentions(rawInput)
  const seen = new Set<string>()
  const normalized: IMessageMention[] = []

  for (const mention of raw) {
    if (!validUserIds.has(mention.userId) || seen.has(mention.userId)) continue
    if (!contentMatchesMention(content, mention)) continue
    seen.add(mention.userId)
    normalized.push({
      userId: new mongoose.Types.ObjectId(mention.userId),
      displayName: mention.displayName,
      start: mention.start,
      end: mention.end,
    })
  }

  return normalized
}

export function truncatePreview(text: string, max = 120): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= max) return compact
  return `${compact.slice(0, max - 1).trim()}…`
}

export async function notifyCommunicationMentions(params: {
  orgId: string
  senderId: string
  senderName: string
  mentionedUserIds: string[]
  content: string
  messageId: string
  contextType: 'channel' | 'direct'
  channelId?: string
  conversationId?: string
  teamId?: string
  teamName?: string
}): Promise<void> {
  const recipients = [...new Set(params.mentionedUserIds.filter((id) => id && id !== params.senderId))]
  if (recipients.length === 0) return

  const preview = truncatePreview(params.content)
  const locationLabel =
    params.contextType === 'channel' && params.teamName
      ? params.teamName
      : 'a direct message'

  await notifyUsers(recipients, {
    organizationId: params.orgId,
    type: 'communication_mention',
    title: `${params.senderName} mentioned you in ${locationLabel}`,
    message: preview ? `"${preview}"` : 'You were mentioned in a message.',
    communicationContextType: params.contextType,
    channelId: params.channelId,
    conversationId: params.conversationId,
    messageId: params.messageId,
    teamId: params.teamId,
  })
}

export async function getSenderDisplayName(userId: string): Promise<string> {
  const user = await User.findById(userId)
  if (!user) return 'Someone'
  return `${user.firstName} ${user.lastName}`.trim() || 'Someone'
}

export function extractMentionUserIds(mentions: IMessageMention[]): string[] {
  return mentions.map((m) => m.userId.toString())
}

export async function resolveChannelMentions(params: {
  orgId: string
  channelId: string
  senderId: string
  content: string
  rawInput: unknown
}): Promise<IMessageMention[]> {
  const raw = parseRawMentions(params.rawInput)
  const validIds = await filterValidChannelMentionUserIds({
    orgId: params.orgId,
    channelId: params.channelId,
    senderId: params.senderId,
    userIds: raw.map((mention) => mention.userId),
  })
  return normalizeMessageMentions(params.content, raw, validIds)
}

export async function resolveDirectMentions(params: {
  conversation: IConversation
  senderId: string
  content: string
  rawInput: unknown
}): Promise<IMessageMention[]> {
  const raw = parseRawMentions(params.rawInput)
  const validIds = filterValidDirectMentionUserIds({
    conversation: params.conversation,
    senderId: params.senderId,
    userIds: raw.map((mention) => mention.userId),
  })
  return normalizeMessageMentions(params.content, raw, validIds)
}

export function parseMentionsInput(input: unknown): unknown {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input)
    } catch {
      return []
    }
  }
  return input
}

export async function listChannelMentionCandidates(params: {
  orgId: string
  channelId: string
  userId: string
  role: MembershipRole
}) {
  const channel = await getAccessibleChannel(
    params.orgId,
    params.channelId,
    params.userId,
    params.role
  )
  if (!channel) return null

  const team = await Team.findOne({ _id: channel.teamId, organizationId: params.orgId })
  if (!team) return null

  const candidateIds = new Set<string>()
  for (const memberId of team.memberIds) {
    candidateIds.add(memberId.toString())
  }
  if (team.leadId) {
    candidateIds.add(team.leadId.toString())
  }

  const adminMemberships = await Membership.find({
    organizationId: params.orgId,
    role: 'admin',
  })
  for (const membership of adminMemberships) {
    candidateIds.add(membership.userId.toString())
  }

  const users = await User.find({ _id: { $in: [...candidateIds] } })
  return users
    .map((user) => ({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }))
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    )
}
