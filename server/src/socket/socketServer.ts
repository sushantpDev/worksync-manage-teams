import type { Server as HttpServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { config } from '../config'
import { verifyAccessToken } from '../utils/jwt'
import { getMembershipForUser } from '../services/membershipService'
import {
  getAccessibleChannel,
  getAccessibleConversation,
} from '../services/communicationAccessService'
import {
  getTypingUserIdentity,
  refreshSocketMembership,
} from '../services/communicationSocketService'
import type { MembershipRole } from '../models/Membership'
import { setSocketIO, getSocketIO } from './socketInstance'

const typingState = new Map<string, Map<string, number>>()

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string
    organizationId: string
    role: MembershipRole
  }
}

async function resolveAuthContext(
  userId: string,
  organizationId: string
): Promise<{ role: MembershipRole } | null> {
  return refreshSocketMembership(userId, organizationId)
}

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  })
  setSocketIO(io)

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined
      if (!token) {
        next(new Error('Authentication required'))
        return
      }

      const payload = verifyAccessToken(token)
      const headerOrgId = socket.handshake.auth?.organizationId as string | undefined
      const orgId = headerOrgId || payload.organizationId

      const membership = await getMembershipForUser(payload.userId, orgId)
      if (!membership) {
        next(new Error('Organization membership required'))
        return
      }

      ;(socket as AuthenticatedSocket).data = {
        userId: payload.userId,
        organizationId: membership.organizationId.toString(),
        role: membership.role,
      }

      next()
    } catch {
      next(new Error('Invalid authentication'))
    }
  })

  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket
    const { userId, organizationId } = authSocket.data

    socket.join(`user:${userId}`)
    socket.join(`org:${organizationId}`)

    socket.on('join-channel', async (channelId: string, ack?: (result: { ok: boolean; error?: string }) => void) => {
      try {
        const membership = await resolveAuthContext(userId, organizationId)
        if (!membership) {
          ack?.({ ok: false, error: 'Organization membership required' })
          return
        }
        authSocket.data.role = membership.role

        const channel = await getAccessibleChannel(
          organizationId,
          channelId,
          userId,
          membership.role
        )
        if (!channel) {
          ack?.({ ok: false, error: 'Channel not found' })
          return
        }
        socket.join(`channel:${channelId}`)
        ack?.({ ok: true })
      } catch {
        ack?.({ ok: false, error: 'Unable to join channel' })
      }
    })

    socket.on('leave-channel', (channelId: string) => {
      socket.leave(`channel:${channelId}`)
    })

    socket.on('join-conversation', async (
      conversationId: string,
      ack?: (result: { ok: boolean; error?: string }) => void
    ) => {
      try {
        const membership = await resolveAuthContext(userId, organizationId)
        if (!membership) {
          ack?.({ ok: false, error: 'Organization membership required' })
          return
        }
        authSocket.data.role = membership.role

        const conversation = await getAccessibleConversation(organizationId, conversationId, userId)
        if (!conversation) {
          ack?.({ ok: false, error: 'Conversation not found' })
          return
        }
        socket.join(`conversation:${conversationId}`)
        ack?.({ ok: true })
      } catch {
        ack?.({ ok: false, error: 'Unable to join conversation' })
      }
    })

    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    socket.on('typing:start', async (payload: { contextType: 'channel' | 'direct'; contextId: string }) => {
      if (!payload?.contextType || !payload?.contextId) return

      const membership = await resolveAuthContext(userId, organizationId)
      if (!membership) return
      authSocket.data.role = membership.role
      const { role } = membership

      const identity = await getTypingUserIdentity(userId)
      const roomKey = `${payload.contextType}:${payload.contextId}`

      if (payload.contextType === 'channel') {
        const channel = await getAccessibleChannel(organizationId, payload.contextId, userId, role)
        if (!channel) return
        socket.to(`channel:${payload.contextId}`).emit('typing:start', {
          contextType: 'channel',
          contextId: payload.contextId,
          user: identity,
        })
      } else {
        const conversation = await getAccessibleConversation(
          organizationId,
          payload.contextId,
          userId
        )
        if (!conversation) return
        socket.to(`conversation:${payload.contextId}`).emit('typing:start', {
          contextType: 'direct',
          contextId: payload.contextId,
          user: identity,
        })
      }

      if (!typingState.has(roomKey)) typingState.set(roomKey, new Map())
      typingState.get(roomKey)!.set(userId, Date.now())
    })

    socket.on('typing:stop', async (payload: { contextType: 'channel' | 'direct'; contextId: string }) => {
      if (!payload?.contextType || !payload?.contextId) return

      const membership = await resolveAuthContext(userId, organizationId)
      if (!membership) return
      authSocket.data.role = membership.role
      const { role } = membership

      const identity = await getTypingUserIdentity(userId)

      if (payload.contextType === 'channel') {
        const channel = await getAccessibleChannel(organizationId, payload.contextId, userId, role)
        if (!channel) return
        socket.to(`channel:${payload.contextId}`).emit('typing:stop', {
          contextType: 'channel',
          contextId: payload.contextId,
          userId: identity.userId,
        })
      } else {
        const conversation = await getAccessibleConversation(
          organizationId,
          payload.contextId,
          userId
        )
        if (!conversation) return
        socket.to(`conversation:${payload.contextId}`).emit('typing:stop', {
          contextType: 'direct',
          contextId: payload.contextId,
          userId: identity.userId,
        })
      }
    })

    socket.on('disconnect', () => {
      for (const [, users] of typingState.entries()) {
        users.delete(userId)
      }
      for (const [roomKey, users] of typingState.entries()) {
        if (users.size === 0) typingState.delete(roomKey)
      }
    })
  })

  return io
}

export function emitChannelEvent(channelId: string, event: string, payload: unknown) {
  getSocketIO()?.to(`channel:${channelId}`).emit(event, payload)
}

export function emitConversationEvent(conversationId: string, event: string, payload: unknown) {
  getSocketIO()?.to(`conversation:${conversationId}`).emit(event, payload)
}

export function emitUserEvent(userId: string, event: string, payload: unknown) {
  getSocketIO()?.to(`user:${userId}`).emit(event, payload)
}

export function emitOrgEvent(organizationId: string, event: string, payload: unknown) {
  getSocketIO()?.to(`org:${organizationId}`).emit(event, payload)
}
