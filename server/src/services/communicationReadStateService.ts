import { Types } from 'mongoose'
import { CommunicationReadState } from '../models/CommunicationReadState'
import { Message, type IMessage } from '../models/Message'
import { Channel } from '../models/Channel'
import { Conversation } from '../models/Conversation'
import { listAccessibleTeams } from './communicationAccessService'
import type { MembershipRole } from '../models/Membership'

export type ReadReceiptStatus = 'sent' | 'read'

export async function upsertReadState(params: {
  orgId: string
  userId: string
  contextType: 'channel' | 'direct'
  channelId?: string
  conversationId?: string
  lastReadMessageId?: string
}) {
  const lastReadAt = new Date()
  const filter: Record<string, unknown> = {
    organizationId: params.orgId,
    userId: params.userId,
    contextType: params.contextType,
  }
  if (params.contextType === 'channel') filter.channelId = params.channelId
  if (params.contextType === 'direct') filter.conversationId = params.conversationId

  return CommunicationReadState.findOneAndUpdate(
    filter,
    {
      $set: {
        lastReadMessageId: params.lastReadMessageId
          ? new Types.ObjectId(params.lastReadMessageId)
          : undefined,
        lastReadAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

export async function countUnreadForChannel(
  orgId: string,
  userId: string,
  channelId: string
): Promise<number> {
  const readState = await CommunicationReadState.findOne({
    organizationId: orgId,
    userId,
    contextType: 'channel',
    channelId,
  })

  const filter: Record<string, unknown> = {
    organizationId: orgId,
    channelId,
    senderId: { $ne: userId },
    deletedAt: null,
  }

  if (readState?.lastReadAt) {
    filter.createdAt = { $gt: readState.lastReadAt }
  }

  return Message.countDocuments(filter)
}

export async function countUnreadForConversation(
  orgId: string,
  userId: string,
  conversationId: string
): Promise<number> {
  const readState = await CommunicationReadState.findOne({
    organizationId: orgId,
    userId,
    contextType: 'direct',
    conversationId,
  })

  const filter: Record<string, unknown> = {
    organizationId: orgId,
    conversationId,
    senderId: { $ne: userId },
    deletedAt: null,
  }

  if (readState?.lastReadAt) {
    filter.createdAt = { $gt: readState.lastReadAt }
  }

  return Message.countDocuments(filter)
}

export async function getTotalUnreadCount(
  orgId: string,
  userId: string,
  role: MembershipRole
): Promise<number> {
  const teams = await listAccessibleTeams(orgId, userId, role)
  const teamIds = teams.map((t) => t._id)

  const channels = await Channel.find({
    organizationId: orgId,
    teamId: { $in: teamIds },
    isDeleted: false,
  }).select('_id')

  const conversations = await Conversation.find({
    organizationId: orgId,
    participantIds: userId,
  }).select('_id')

  const channelCounts = await Promise.all(
    channels.map((c) => countUnreadForChannel(orgId, userId, c._id.toString()))
  )
  const conversationCounts = await Promise.all(
    conversations.map((c) => countUnreadForConversation(orgId, userId, c._id.toString()))
  )

  return [...channelCounts, ...conversationCounts].reduce((sum, n) => sum + n, 0)
}

export async function buildReadReceiptMap(
  orgId: string,
  currentUserId: string,
  messages: IMessage[]
): Promise<Map<string, ReadReceiptStatus>> {
  const map = new Map<string, ReadReceiptStatus>()
  const ownMessages = messages.filter(
    (message) =>
      !message.deletedAt && message.senderId.toString() === currentUserId
  )

  if (ownMessages.length === 0) return map

  const conversationIds = [
    ...new Set(
      ownMessages
        .filter((message) => message.conversationId)
        .map((message) => message.conversationId!.toString())
    ),
  ]
  const channelIds = [
    ...new Set(
      ownMessages
        .filter((message) => message.channelId)
        .map((message) => message.channelId!.toString())
    ),
  ]

  const [conversationReadStates, channelReadStates] = await Promise.all([
    conversationIds.length
      ? CommunicationReadState.find({
          organizationId: orgId,
          contextType: 'direct',
          conversationId: { $in: conversationIds },
          userId: { $ne: currentUserId },
        })
      : [],
    channelIds.length
      ? CommunicationReadState.find({
          organizationId: orgId,
          contextType: 'channel',
          channelId: { $in: channelIds },
          userId: { $ne: currentUserId },
        })
      : [],
  ])

  for (const message of ownMessages) {
    const messageId = message._id.toString()
    map.set(messageId, 'sent')

    const peerStates =
      message.contextType === 'direct' && message.conversationId
        ? conversationReadStates.filter(
            (state) => state.conversationId?.toString() === message.conversationId!.toString()
          )
        : message.contextType === 'channel' && message.channelId
          ? channelReadStates.filter(
              (state) => state.channelId?.toString() === message.channelId!.toString()
            )
          : []

    const isRead = peerStates.some((state) => {
      if (state.lastReadMessageId?.toString() === messageId) return true
      return state.lastReadAt >= message.createdAt
    })

    if (isRead) {
      map.set(messageId, 'read')
    }
  }

  return map
}
