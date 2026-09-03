import type { Response } from 'express'
import crypto from 'crypto'
import { Channel } from '../models/Channel'
import { Conversation } from '../models/Conversation'
import { Message } from '../models/Message'
import { MessageReaction } from '../models/MessageReaction'
import type { AuthRequest } from '../middleware/auth'
import {
  canManageChannels,
  canMutateCommunication,
  getAccessibleChannel,
  getAccessibleConversation,
  getAccessibleTeam,
  getRole,
  listAccessibleTeams,
} from '../services/communicationAccessService'
import { ensureGeneralChannel, ensureGeneralChannelsForTeams } from '../services/channelService'
import { findOrCreateDirectConversation } from '../services/conversationService'
import {
  buildUserMap,
  mapMessagesDto,
  paginateMessages,
  serializeUserSummary,
  updateConversationPreview,
} from '../services/communicationMessageService'
import {
  countUnreadForChannel,
  countUnreadForConversation,
  getTotalUnreadCount,
  upsertReadState,
} from '../services/communicationReadStateService'
import {
  ALLOWED_REACTION_EMOJIS,
  isValidMessageContent,
  normalizeMessageContent,
  slugifyChannelName,
} from '../services/communicationUtils'
import {
  buildAttachmentContentDisposition,
  sanitizeAttachmentFileName,
  uploadCommunicationAttachment,
  validateCommunicationAttachmentFile,
} from '../services/communicationAttachmentService'
import { isCloudinaryConfigured } from '../config/cloudinary'
import {
  emitChannelEvent,
  emitConversationEvent,
  emitOrgEvent,
  emitUserEvent,
} from '../socket/socketServer'
import {
  extractMentionUserIds,
  getSenderDisplayName,
  notifyCommunicationMentions,
  parseMentionsInput,
  resolveChannelMentions,
  resolveDirectMentions,
  listChannelMentionCandidates,
} from '../services/communicationMentionService'
import { Team } from '../models/Team'

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

async function broadcastMessageDto(messageId: string, userId: string) {
  const message = await Message.findById(messageId)
  if (!message) return null
  const [dto] = await mapMessagesDto([message], userId)
  return dto
}

export async function getSidebar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)

    const teams = await listAccessibleTeams(orgId, userId, role)
    await ensureGeneralChannelsForTeams(
      orgId,
      teams.map((t) => t._id.toString()),
      userId
    )

    const teamData = await Promise.all(
      teams.map(async (team) => {
        const channels = await Channel.find({
          organizationId: orgId,
          teamId: team._id,
          isDeleted: false,
        }).sort({ isGeneral: -1, name: 1 })

        const channelsWithUnread = await Promise.all(
          channels.map(async (channel) => ({
            id: channel._id.toString(),
            teamId: team._id.toString(),
            name: channel.name,
            slug: channel.slug,
            description: channel.description,
            isGeneral: channel.isGeneral,
            unreadCount: await countUnreadForChannel(orgId, userId, channel._id.toString()),
          }))
        )

        return {
          id: team._id.toString(),
          name: team.name,
          channels: channelsWithUnread,
        }
      })
    )

    const conversations = await Conversation.find({
      organizationId: orgId,
      participantIds: userId,
    }).sort({ lastMessageAt: -1, updatedAt: -1 })

    const otherUserIds = conversations.flatMap((c) =>
      c.participantIds.map((id) => id.toString()).filter((id) => id !== userId)
    )
    const userMap = await buildUserMap(otherUserIds)

    const directMessages = await Promise.all(
      conversations.map(async (conversation) => {
        const otherId = conversation.participantIds
          .map((id) => id.toString())
          .find((id) => id !== userId)
        const otherUser = otherId ? userMap.get(otherId) : undefined
        let lastMessagePreview = ''
        if (conversation.lastMessageId) {
          const lastMsg = await Message.findById(conversation.lastMessageId)
          if (lastMsg) {
            lastMessagePreview = lastMsg.deletedAt ? 'Message deleted' : lastMsg.content
          }
        }

        return {
          id: conversation._id.toString(),
          participant: otherUser ? serializeUserSummary(otherUser) : null,
          lastMessagePreview,
          lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
          unreadCount: await countUnreadForConversation(orgId, userId, conversation._id.toString()),
        }
      })
    )

    const totalUnread = await getTotalUnreadCount(orgId, userId, role)

    res.json({ teams: teamData, directMessages, totalUnread })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getUnreadTotal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = getRole(req.membership?.role, req.user!.role)
    const totalUnread = await getTotalUnreadCount(req.organizationId!, req.user!.userId, role)
    res.json({ totalUnread })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function listTeamChannels(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const teamId = paramId(req.params.teamId)

    const team = await getAccessibleTeam(orgId, teamId, userId, role)
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    await ensureGeneralChannel(orgId, teamId, userId)
    const channels = await Channel.find({ organizationId: orgId, teamId, isDeleted: false }).sort({
      isGeneral: -1,
      name: 1,
    })

    res.json(
      channels.map((c) => ({
        id: c._id.toString(),
        teamId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        isGeneral: c.isGeneral,
      }))
    )
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function createChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const teamId = paramId(req.params.teamId)
    const { name, description } = req.body

    if (!canManageChannels(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const team = await getAccessibleTeam(orgId, teamId, userId, role)
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    if (!name?.trim()) {
      res.status(400).json({ error: 'Channel name is required' })
      return
    }

    const slug = slugifyChannelName(name)
    if (slug === 'general') {
      res.status(400).json({ error: 'Cannot create another general channel' })
      return
    }

    const channel = await Channel.create({
      organizationId: orgId,
      teamId,
      name: name.trim(),
      slug,
      description: description?.trim(),
      createdBy: userId,
    })

    res.status(201).json({
      id: channel._id.toString(),
      teamId,
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      isGeneral: channel.isGeneral,
    })
  } catch (error) {
    const mongoError = error as { code?: number }
    if (mongoError.code === 11000) {
      res.status(409).json({ error: 'A channel with this name already exists' })
      return
    }
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const channelId = paramId(req.params.channelId)
    const { name, description } = req.body

    if (!canManageChannels(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const channel = await getAccessibleChannel(orgId, channelId, userId, role)
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' })
      return
    }

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: 'Channel name is required' })
        return
      }
      if (channel.isGeneral) {
        res.status(400).json({ error: 'Cannot rename the general channel' })
        return
      }
      channel.name = name.trim()
      channel.slug = slugifyChannelName(name)
    }
    if (description !== undefined) channel.description = description?.trim()

    await channel.save()
    res.json({
      id: channel._id.toString(),
      teamId: channel.teamId.toString(),
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      isGeneral: channel.isGeneral,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const channelId = paramId(req.params.channelId)

    if (!canManageChannels(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const channel = await getAccessibleChannel(orgId, channelId, userId, role)
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' })
      return
    }

    if (channel.isGeneral) {
      res.status(400).json({ error: 'Cannot delete the general channel' })
      return
    }

    channel.isDeleted = true
    await channel.save()
    res.json({ message: 'Channel deleted' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function startDirectConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const { userId: targetUserId } = req.body

    if (!targetUserId) {
      res.status(400).json({ error: 'userId is required' })
      return
    }

    const conversation = await findOrCreateDirectConversation(orgId, userId, String(targetUserId))
    const otherId = conversation.participantIds
      .map((id) => id.toString())
      .find((id) => id !== userId)
    const userMap = otherId ? await buildUserMap([otherId]) : new Map()
    const otherUser = otherId ? userMap.get(otherId) : undefined

    res.json({
      id: conversation._id.toString(),
      participant: otherUser ? serializeUserSummary(otherUser) : null,
    })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
}

export async function listChannelMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const channelId = paramId(req.params.channelId)
    const before = req.query.before as string | undefined
    const limit = parseInt(String(req.query.limit ?? '30'), 10)

    const channel = await getAccessibleChannel(orgId, channelId, userId, role)
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' })
      return
    }

    const result = await paginateMessages({
      orgId,
      channelId,
      before,
      limit,
      currentUserId: userId,
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getChannelMentionCandidates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const channelId = paramId(req.params.channelId)

    const candidates = await listChannelMentionCandidates({
      orgId,
      channelId,
      userId,
      role,
    })

    if (!candidates) {
      res.status(404).json({ error: 'Channel not found' })
      return
    }

    res.json({ members: candidates })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function listConversationMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const conversationId = paramId(req.params.conversationId)
    const before = req.query.before as string | undefined
    const limit = parseInt(String(req.query.limit ?? '30'), 10)

    const conversation = await getAccessibleConversation(orgId, conversationId, userId)
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const result = await paginateMessages({
      orgId,
      conversationId,
      before,
      limit,
      currentUserId: userId,
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

async function createMessageRecord(params: {
  orgId: string
  userId: string
  contextType: 'channel' | 'direct'
  channelId?: string
  conversationId?: string
  content: string
  mentions?: {
    userId: string
    displayName: string
    start: number
    end: number
  }[]
  replyToMessageId?: string
  attachments?: {
    fileName: string
    fileUrl: string
    publicId: string
    resourceType: 'image' | 'raw'
    mimeType: string
    size: number
  }[]
}) {
  if (params.replyToMessageId) {
    const replyMessage = await Message.findOne({
      _id: params.replyToMessageId,
      organizationId: params.orgId,
    })
    if (!replyMessage) throw new Error('Reply message not found')
    if (params.contextType === 'channel') {
      if (replyMessage.channelId?.toString() !== params.channelId) {
        throw new Error('Reply message must belong to the same channel')
      }
    } else if (replyMessage.conversationId?.toString() !== params.conversationId) {
      throw new Error('Reply message must belong to the same conversation')
    }
  }

  const message = await Message.create({
    organizationId: params.orgId,
    contextType: params.contextType,
    channelId: params.channelId,
    conversationId: params.conversationId,
    senderId: params.userId,
    content: params.content,
    mentions: (params.mentions ?? []).map((mention) => ({
      userId: mention.userId,
      displayName: mention.displayName,
      start: mention.start,
      end: mention.end,
    })),
    replyToMessageId: params.replyToMessageId,
    attachments: params.attachments ?? [],
  })

  if (params.conversationId) {
    await updateConversationPreview(message.conversationId!, message._id, message.createdAt)
  }

  return message
}

export async function sendChannelMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const channelId = paramId(req.params.channelId)

    if (!canMutateCommunication(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const channel = await getAccessibleChannel(orgId, channelId, userId, role)
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' })
      return
    }

    const content = normalizeMessageContent(String(req.body.content ?? ''))
    const replyToMessageId = req.body.replyToMessageId as string | undefined
    let attachments: {
      fileName: string
      fileUrl: string
      publicId: string
      resourceType: 'image' | 'raw'
      mimeType: string
      size: number
    }[] = []

    if (req.file) {
      if (!isCloudinaryConfigured()) {
        res.status(503).json({ error: 'File upload is not configured' })
        return
      }
      const validationError = validateCommunicationAttachmentFile(req.file.mimetype, req.file.size)
      if (validationError) {
        res.status(400).json({ error: validationError })
        return
      }
      const attachmentId = crypto.randomBytes(16).toString('hex')
      const uploaded = await uploadCommunicationAttachment({
        orgId,
        contextId: channelId,
        attachmentId,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
      })
      uploaded.fileName = sanitizeAttachmentFileName(req.file.originalname)
      attachments = [uploaded]
    }

    if (!isValidMessageContent(content, attachments.length > 0)) {
      res.status(400).json({ error: 'Message content or attachment is required' })
      return
    }

    const mentions = await resolveChannelMentions({
      orgId,
      channelId,
      senderId: userId,
      content,
      rawInput: parseMentionsInput(req.body.mentions),
    })

    const message = await createMessageRecord({
      orgId,
      userId,
      contextType: 'channel',
      channelId,
      content,
      mentions: mentions.map((mention) => ({
        userId: mention.userId.toString(),
        displayName: mention.displayName,
        start: mention.start,
        end: mention.end,
      })),
      replyToMessageId,
      attachments,
    })

    const dto = await broadcastMessageDto(message._id.toString(), userId)
    if (dto) {
      emitChannelEvent(channelId, 'message:new', dto)
      emitOrgEvent(orgId, 'communication:unread', {})
    }

    const mentionedUserIds = extractMentionUserIds(mentions)
    if (mentionedUserIds.length > 0) {
      const team = await Team.findById(channel.teamId)
      const senderName = await getSenderDisplayName(userId)
      await notifyCommunicationMentions({
        orgId,
        senderId: userId,
        senderName,
        mentionedUserIds,
        content,
        messageId: message._id.toString(),
        contextType: 'channel',
        channelId,
        teamId: channel.teamId.toString(),
        teamName: team?.name,
      })
    }

    res.status(201).json(dto)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function sendConversationMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const conversationId = paramId(req.params.conversationId)

    if (!canMutateCommunication(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const conversation = await getAccessibleConversation(orgId, conversationId, userId)
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const content = normalizeMessageContent(String(req.body.content ?? ''))
    const replyToMessageId = req.body.replyToMessageId as string | undefined
    let attachments: {
      fileName: string
      fileUrl: string
      publicId: string
      resourceType: 'image' | 'raw'
      mimeType: string
      size: number
    }[] = []

    if (req.file) {
      if (!isCloudinaryConfigured()) {
        res.status(503).json({ error: 'File upload is not configured' })
        return
      }
      const validationError = validateCommunicationAttachmentFile(req.file.mimetype, req.file.size)
      if (validationError) {
        res.status(400).json({ error: validationError })
        return
      }
      const attachmentId = crypto.randomBytes(16).toString('hex')
      const uploaded = await uploadCommunicationAttachment({
        orgId,
        contextId: conversationId,
        attachmentId,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
      })
      uploaded.fileName = sanitizeAttachmentFileName(req.file.originalname)
      attachments = [uploaded]
    }

    if (!isValidMessageContent(content, attachments.length > 0)) {
      res.status(400).json({ error: 'Message content or attachment is required' })
      return
    }

    const mentions = await resolveDirectMentions({
      conversation,
      senderId: userId,
      content,
      rawInput: parseMentionsInput(req.body.mentions),
    })

    const message = await createMessageRecord({
      orgId,
      userId,
      contextType: 'direct',
      conversationId,
      content,
      mentions: mentions.map((mention) => ({
        userId: mention.userId.toString(),
        displayName: mention.displayName,
        start: mention.start,
        end: mention.end,
      })),
      replyToMessageId,
      attachments,
    })

    const dto = await broadcastMessageDto(message._id.toString(), userId)
    if (dto) {
      emitConversationEvent(conversationId, 'message:new', dto)
      for (const participantId of conversation.participantIds) {
        emitUserEvent(participantId.toString(), 'communication:unread', {})
      }
    }

    const mentionedUserIds = extractMentionUserIds(mentions)
    if (mentionedUserIds.length > 0) {
      const senderName = await getSenderDisplayName(userId)
      await notifyCommunicationMentions({
        orgId,
        senderId: userId,
        senderName,
        mentionedUserIds,
        content,
        messageId: message._id.toString(),
        contextType: 'direct',
        conversationId,
      })
    }

    res.status(201).json(dto)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

async function getAccessibleMessage(req: AuthRequest, messageId: string) {
  const orgId = req.organizationId!
  const userId = req.user!.userId
  const role = getRole(req.membership?.role, req.user!.role)

  const message = await Message.findOne({ _id: messageId, organizationId: orgId })
  if (!message) return null

  if (message.contextType === 'channel' && message.channelId) {
    const channel = await getAccessibleChannel(orgId, message.channelId.toString(), userId, role)
    return channel ? message : null
  }

  if (message.contextType === 'direct' && message.conversationId) {
    const conversation = await getAccessibleConversation(
      orgId,
      message.conversationId.toString(),
      userId
    )
    return conversation ? message : null
  }

  return null
}

export async function editMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const messageId = paramId(req.params.messageId)
    const content = normalizeMessageContent(String(req.body.content ?? ''))

    if (!canMutateCommunication(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const message = await getAccessibleMessage(req, messageId)
    if (!message || message.deletedAt) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    if (message.senderId.toString() !== userId) {
      res.status(403).json({ error: 'You can only edit your own messages' })
      return
    }

    if (!isValidMessageContent(content, message.attachments.length > 0)) {
      res.status(400).json({ error: 'Message content is required' })
      return
    }

    const previousMentionIds = new Set(extractMentionUserIds(message.mentions ?? []))
    let resolvedMentions = message.mentions ?? []

    if (req.body.mentions !== undefined) {
      if (message.contextType === 'channel' && message.channelId) {
        resolvedMentions = await resolveChannelMentions({
          orgId,
          channelId: message.channelId.toString(),
          senderId: userId,
          content,
          rawInput: parseMentionsInput(req.body.mentions),
        })
      } else if (message.contextType === 'direct' && message.conversationId) {
        const conversation = await getAccessibleConversation(
          orgId,
          message.conversationId.toString(),
          userId
        )
        if (!conversation) {
          res.status(404).json({ error: 'Conversation not found' })
          return
        }
        resolvedMentions = await resolveDirectMentions({
          conversation,
          senderId: userId,
          content,
          rawInput: parseMentionsInput(req.body.mentions),
        })
      }
    }

    message.content = content
    message.mentions = resolvedMentions
    message.editedAt = new Date()
    await message.save()

    const dto = await broadcastMessageDto(messageId, userId)
    if (dto) {
      if (message.channelId) emitChannelEvent(message.channelId.toString(), 'message:updated', dto)
      if (message.conversationId) {
        emitConversationEvent(message.conversationId.toString(), 'message:updated', dto)
      }
    }

    const newMentionIds = extractMentionUserIds(resolvedMentions).filter(
      (id) => !previousMentionIds.has(id) && id !== userId
    )
    if (newMentionIds.length > 0) {
      const senderName = await getSenderDisplayName(userId)
      if (message.contextType === 'channel' && message.channelId) {
        const channel = await Channel.findById(message.channelId)
        const team = channel ? await Team.findById(channel.teamId) : null
        await notifyCommunicationMentions({
          orgId,
          senderId: userId,
          senderName,
          mentionedUserIds: newMentionIds,
          content,
          messageId,
          contextType: 'channel',
          channelId: message.channelId.toString(),
          teamId: channel?.teamId.toString(),
          teamName: team?.name,
        })
      } else if (message.conversationId) {
        await notifyCommunicationMentions({
          orgId,
          senderId: userId,
          senderName,
          mentionedUserIds: newMentionIds,
          content,
          messageId,
          contextType: 'direct',
          conversationId: message.conversationId.toString(),
        })
      }
    }

    res.json(dto)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const messageId = paramId(req.params.messageId)

    if (!canMutateCommunication(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const message = await getAccessibleMessage(req, messageId)
    if (!message || message.deletedAt) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    const isSender = message.senderId.toString() === userId
    const isModerator = role === 'admin' || role === 'manager'
    if (!isSender && !isModerator) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    message.deletedAt = new Date()
    message.content = ''
    await message.save()

    const payload = { id: messageId, deletedAt: message.deletedAt.toISOString() }
    if (message.channelId) emitChannelEvent(message.channelId.toString(), 'message:deleted', payload)
    if (message.conversationId) {
      emitConversationEvent(message.conversationId.toString(), 'message:deleted', payload)
    }

    res.json({ message: 'Message deleted', id: messageId })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function addReaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const messageId = paramId(req.params.messageId)
    const { emoji } = req.body

    if (!canMutateCommunication(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    if (!emoji || !ALLOWED_REACTION_EMOJIS.includes(emoji)) {
      res.status(400).json({ error: 'Invalid reaction emoji' })
      return
    }

    const message = await getAccessibleMessage(req, messageId)
    if (!message || message.deletedAt) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    await MessageReaction.findOneAndUpdate(
      { messageId, userId, emoji },
      { organizationId: orgId, messageId, userId, emoji },
      { upsert: true, new: true }
    )

    const dto = await broadcastMessageDto(messageId, userId)
    const event = { messageId, message: dto }
    if (message.channelId) emitChannelEvent(message.channelId.toString(), 'message:reaction', event)
    if (message.conversationId) {
      emitConversationEvent(message.conversationId.toString(), 'message:reaction', event)
    }

    res.json(dto)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function removeReaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const messageId = paramId(req.params.messageId)
    const emoji = decodeURIComponent(paramId(req.params.emoji))

    if (!canMutateCommunication(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const message = await getAccessibleMessage(req, messageId)
    if (!message) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    await MessageReaction.deleteOne({ messageId, userId, emoji, organizationId: orgId })

    const dto = await broadcastMessageDto(messageId, userId)
    const event = { messageId, message: dto }
    if (message.channelId) emitChannelEvent(message.channelId.toString(), 'message:reaction', event)
    if (message.conversationId) {
      emitConversationEvent(message.conversationId.toString(), 'message:reaction', event)
    }

    res.json(dto)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function markChannelRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const role = getRole(req.membership?.role, req.user!.role)
    const channelId = paramId(req.params.channelId)
    const { lastReadMessageId } = req.body

    const channel = await getAccessibleChannel(orgId, channelId, userId, role)
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' })
      return
    }

    const readState = await upsertReadState({
      orgId,
      userId,
      contextType: 'channel',
      channelId,
      lastReadMessageId,
    })

    const readReceiptPayload = {
      contextType: 'channel' as const,
      channelId,
      readerId: userId,
      lastReadMessageId,
      lastReadAt: readState.lastReadAt.toISOString(),
    }
    emitChannelEvent(channelId, 'communication:read-receipt', readReceiptPayload)
    emitUserEvent(userId, 'communication:read', { contextType: 'channel', channelId })
    res.json({ message: 'Read state updated' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function markConversationRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!
    const userId = req.user!.userId
    const conversationId = paramId(req.params.conversationId)
    const { lastReadMessageId } = req.body

    const conversation = await getAccessibleConversation(orgId, conversationId, userId)
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const readState = await upsertReadState({
      orgId,
      userId,
      contextType: 'direct',
      conversationId,
      lastReadMessageId,
    })

    const readReceiptPayload = {
      contextType: 'direct' as const,
      conversationId,
      readerId: userId,
      lastReadMessageId,
      lastReadAt: readState.lastReadAt.toISOString(),
    }
    emitConversationEvent(conversationId, 'communication:read-receipt', readReceiptPayload)
    emitUserEvent(userId, 'communication:read', { contextType: 'direct', conversationId })
    res.json({ message: 'Read state updated' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function downloadMessageAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const messageId = paramId(req.params.messageId)
    const attachmentId = paramId(req.params.attachmentId)

    const message = await getAccessibleMessage(req, messageId)
    if (!message || message.deletedAt) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    const attachment = message.attachments.find((item) => item._id.toString() === attachmentId)
    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' })
      return
    }

    const remote = await fetch(attachment.fileUrl)
    if (!remote.ok) {
      res.status(502).json({ error: 'Failed to fetch attachment' })
      return
    }

    const buffer = Buffer.from(await remote.arrayBuffer())
    res.setHeader('Content-Type', attachment.mimeType)
    res.setHeader('Content-Disposition', buildAttachmentContentDisposition(attachment.fileName))
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
