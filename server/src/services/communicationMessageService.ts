import { Message, type IMessage } from '../models/Message'
import { MessageReaction } from '../models/MessageReaction'
import { Conversation } from '../models/Conversation'
import { User } from '../models/User'
import type { Types } from 'mongoose'
import { buildReadReceiptMap, type ReadReceiptStatus } from './communicationReadStateService'

export async function buildUserMap(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map<string, InstanceType<typeof User>>()
  const users = await User.find({ _id: { $in: uniqueIds } })
  return new Map(users.map((u) => [u._id.toString(), u]))
}

export function serializeUserSummary(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

async function buildReactionsMap(messageIds: string[]) {
  if (messageIds.length === 0) {
    return new Map<
      string,
      { emoji: string; count: number; users: { id: string; firstName: string; lastName: string }[] }[]
    >()
  }

  const reactions = await MessageReaction.find({ messageId: { $in: messageIds } })
  const userIds = reactions.map((r) => r.userId.toString())
  const userMap = await buildUserMap(userIds)

  const map = new Map<
    string,
    { emoji: string; count: number; users: { id: string; firstName: string; lastName: string }[] }[]
  >()

  for (const reaction of reactions) {
    const messageId = reaction.messageId.toString()
    const list = map.get(messageId) ?? []
    let group = list.find((g) => g.emoji === reaction.emoji)
    if (!group) {
      group = { emoji: reaction.emoji, count: 0, users: [] }
      list.push(group)
    }
    group.count++
    const user = userMap.get(reaction.userId.toString())
    if (user) {
      group.users.push({
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
      })
    }
    map.set(messageId, list)
  }

  return map
}

export async function mapMessageDto(
  message: IMessage,
  userMap: Map<string, InstanceType<typeof User>>,
  reactionsMap: Map<
    string,
    { emoji: string; count: number; users: { id: string; firstName: string; lastName: string }[] }[]
  >,
  replyMap: Map<string, IMessage>,
  currentUserId?: string,
  readReceiptMap?: Map<string, ReadReceiptStatus>
) {
  const sender = userMap.get(message.senderId.toString())
  const reactions = (reactionsMap.get(message._id.toString()) ?? []).map((r) => ({
    ...r,
    reactedByMe: currentUserId ? r.users.some((u) => u.id === currentUserId) : false,
  }))

  let replyTo = null
  if (message.replyToMessageId) {
    const replyMessage = replyMap.get(message.replyToMessageId.toString())
    if (replyMessage) {
      const replySender = userMap.get(replyMessage.senderId.toString())
      replyTo = {
        id: replyMessage._id.toString(),
        content: replyMessage.deletedAt ? '' : replyMessage.content,
        deletedAt: replyMessage.deletedAt?.toISOString() ?? null,
        sender: replySender ? serializeUserSummary(replySender) : null,
      }
    }
  }

  const mentionUsers = message.deletedAt
    ? []
    : (message.mentions ?? []).map((mention) => {
        const user = userMap.get(mention.userId.toString())
        return {
          userId: mention.userId.toString(),
          name: mention.displayName,
          avatarUrl: user?.avatarUrl,
          start: mention.start,
          end: mention.end,
        }
      })

  const isOwnMessage = currentUserId && message.senderId.toString() === currentUserId
  const readReceipt =
    isOwnMessage && !message.deletedAt
      ? readReceiptMap?.get(message._id.toString()) ?? 'sent'
      : undefined

  return {
    id: message._id.toString(),
    contextType: message.contextType,
    channelId: message.channelId?.toString(),
    conversationId: message.conversationId?.toString(),
    content: message.deletedAt ? '' : message.content,
    sender: sender ? serializeUserSummary(sender) : null,
    replyTo,
    mentions: mentionUsers,
    attachments: message.deletedAt
      ? []
      : message.attachments.map((attachment) => ({
          _id: attachment._id.toString(),
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          publicId: attachment.publicId,
          resourceType: attachment.resourceType,
          mimeType: attachment.mimeType,
          size: attachment.size,
        })),
    reactions,
    readReceipt,
    editedAt: message.editedAt?.toISOString() ?? null,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  }
}

export async function mapMessagesDto(messages: IMessage[], currentUserId?: string) {
  const messageIds = messages.map((m) => m._id.toString())
  const replyIds = messages
    .map((m) => m.replyToMessageId?.toString())
    .filter((id): id is string => Boolean(id))

  const replyMessages = replyIds.length ? await Message.find({ _id: { $in: replyIds } }) : []
  const replyMap = new Map(replyMessages.map((m) => [m._id.toString(), m]))

  const userIds = [
    ...messages.map((m) => m.senderId.toString()),
    ...replyMessages.map((m) => m.senderId.toString()),
    ...messages.flatMap((m) => (m.mentions ?? []).map((mention) => mention.userId.toString())),
  ]
  const userMap = await buildUserMap(userIds)
  const reactionsMap = await buildReactionsMap(messageIds)
  const readReceiptMap = currentUserId
    ? await buildReadReceiptMap(
        messages[0]?.organizationId.toString() ?? '',
        currentUserId,
        messages
      )
    : new Map<string, ReadReceiptStatus>()

  return Promise.all(
    messages.map((m) =>
      mapMessageDto(m, userMap, reactionsMap, replyMap, currentUserId, readReceiptMap)
    )
  )
}

export function buildMessageContextFilter(params: {
  orgId: string
  channelId?: string
  conversationId?: string
}) {
  const filter: Record<string, unknown> = { organizationId: params.orgId }
  if (params.channelId) {
    filter.channelId = params.channelId
    filter.contextType = 'channel'
  }
  if (params.conversationId) {
    filter.conversationId = params.conversationId
    filter.contextType = 'direct'
  }
  return filter
}

export async function paginateMessages(params: {
  orgId: string
  channelId?: string
  conversationId?: string
  before?: string
  limit?: number
  maxLimit?: number
  currentUserId?: string
}) {
  const limit = Math.min(params.limit ?? 30, params.maxLimit ?? 50)
  const filter = buildMessageContextFilter({
    orgId: params.orgId,
    channelId: params.channelId,
    conversationId: params.conversationId,
  })

  if (params.before) {
    const cursor = await Message.findOne({ _id: params.before, organizationId: params.orgId })
    if (cursor) {
      filter.createdAt = { $lt: cursor.createdAt }
    }
  }

  const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(limit)
  const ordered = [...messages].reverse()
  const items = await mapMessagesDto(ordered, params.currentUserId)
  const nextCursor = messages.length === limit ? messages[messages.length - 1]._id.toString() : null

  return { messages: items, nextCursor }
}

export async function updateConversationPreview(
  conversationId: Types.ObjectId,
  messageId: Types.ObjectId,
  createdAt: Date
) {
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessageId: messageId,
    lastMessageAt: createdAt,
  })
}
