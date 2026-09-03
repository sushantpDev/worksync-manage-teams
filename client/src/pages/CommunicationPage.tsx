import { MessageSquareText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCommunication, useCommunicationSocket } from '../context/CommunicationContext'
import { useNotifications } from '../context/NotificationsContext'
import { communicationApi, organizationsApi, teamsApi, type MessageMentionInput } from '../lib/api'
import { canManageTeamMembers } from '../lib/permissions'
import type { MentionCandidate } from '../lib/mentionUtils'
import type {
  CommunicationAccessRevokedPayload,
  CommunicationChannelSummary,
  CommunicationMessage,
  CommunicationSelection,
  CommunicationSidebarData,
  DirectMessageSummary,
  OrganizationMember,
  Team,
  TypingUserIdentity,
} from '../types'
import { ChatHeader } from '../components/communication/ChatHeader'
import { TeamDetailsDrawer } from '../components/communication/TeamDetailsDrawer'
import { ChannelModal } from '../components/communication/ChannelModal'
import { CommunicationSidebar } from '../components/communication/CommunicationSidebar'
import { DeleteChannelModal } from '../components/communication/DeleteChannelModal'
import { MessageComposer } from '../components/communication/MessageComposer'
import { MessageList } from '../components/communication/MessageList'
import { NewMessageModal } from '../components/communication/NewMessageModal'
import { cn } from '../lib/utils'

function selectionKey(selection: CommunicationSelection | null): string {
  if (!selection) return 'none'
  return selection.type === 'channel'
    ? `channel:${selection.channelId}`
    : `direct:${selection.conversationId}`
}

function upsertMessage(list: CommunicationMessage[], message: CommunicationMessage): CommunicationMessage[] {
  const index = list.findIndex((m) => m.id === message.id)
  if (index >= 0) {
    const next = [...list]
    next[index] = message
    return next
  }
  return [...list, message]
}

function applyDeleted(list: CommunicationMessage[], payload: { id: string; deletedAt: string }): CommunicationMessage[] {
  return list.map((m) =>
    m.id === payload.id
      ? { ...m, deletedAt: payload.deletedAt, content: '', attachments: [], mentions: [] }
      : m
  )
}

function channelToSelection(
  teamId: string,
  channel: CommunicationChannelSummary
): CommunicationSelection {
  return {
    type: 'channel',
    channelId: channel.id,
    teamId,
    title: channel.name,
    slug: channel.slug,
    isGeneral: channel.isGeneral,
    description: channel.description,
  }
}

function dmToSelection(dm: DirectMessageSummary): CommunicationSelection {
  const name = dm.participant
    ? `${dm.participant.firstName} ${dm.participant.lastName}`
    : 'Unknown'
  return {
    type: 'direct',
    conversationId: dm.id,
    title: name,
    participant: dm.participant,
  }
}

function formatTypingLabel(users: TypingUserIdentity[]): string | null {
  if (users.length === 0) return null
  const names = users.map((u) => `${u.firstName} ${u.lastName}`.trim())
  if (names.length === 1) return `${names[0]} is typing...`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`
  const others = names.length - 2
  return `${names[0]}, ${names[1]} and ${others} ${others === 1 ? 'other' : 'others'} are typing...`
}

function messagePreview(message: CommunicationMessage): string {
  const text = message.content.trim()
  if (text) return text
  if (message.attachments.length > 0) {
    const first = message.attachments[0]
    if (first.mimeType.startsWith('image/')) return 'Photo'
    return first.fileName || 'Attachment'
  }
  return ''
}

function sortDirectMessages(dms: DirectMessageSummary[]): DirectMessageSummary[] {
  return [...dms].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return bTime - aTime
  })
}

function clearSelectionUnread(
  prev: CommunicationSidebarData,
  sel: CommunicationSelection
): CommunicationSidebarData {
  if (sel.type === 'channel') {
    let cleared = 0
    const teams = prev.teams.map((team) => ({
      ...team,
      channels: team.channels.map((ch) => {
        if (ch.id === sel.channelId && ch.unreadCount > 0) {
          cleared = ch.unreadCount
          return { ...ch, unreadCount: 0 }
        }
        return ch
      }),
    }))
    return cleared > 0
      ? { ...prev, teams, totalUnread: Math.max(0, prev.totalUnread - cleared) }
      : prev
  }

  const dm = prev.directMessages.find((d) => d.id === sel.conversationId)
  const cleared = dm?.unreadCount ?? 0
  if (cleared <= 0) return prev

  return {
    ...prev,
    directMessages: prev.directMessages.map((d) =>
      d.id === sel.conversationId ? { ...d, unreadCount: 0 } : d
    ),
    totalUnread: Math.max(0, prev.totalUnread - cleared),
  }
}

function applySidebarAfterOwnMessage(
  prev: CommunicationSidebarData,
  sel: CommunicationSelection,
  message: CommunicationMessage
): CommunicationSidebarData {
  const preview = messagePreview(message)

  if (sel.type === 'direct') {
    const cleared = prev.directMessages.find((d) => d.id === sel.conversationId)?.unreadCount ?? 0
    const directMessages = sortDirectMessages(
      prev.directMessages.map((d) =>
        d.id === sel.conversationId
          ? {
              ...d,
              lastMessagePreview: preview,
              lastMessageAt: message.createdAt,
              unreadCount: 0,
            }
          : d
      )
    )
    return {
      ...prev,
      directMessages,
      totalUnread: Math.max(0, prev.totalUnread - cleared),
    }
  }

  return clearSelectionUnread(prev, sel)
}

function applySidebarIncomingMessage(
  prev: CommunicationSidebarData,
  msg: CommunicationMessage
): CommunicationSidebarData {
  if (msg.channelId) {
    let found = false
    const teams = prev.teams.map((team) => ({
      ...team,
      channels: team.channels.map((ch) => {
        if (ch.id === msg.channelId) {
          found = true
          return { ...ch, unreadCount: ch.unreadCount + 1 }
        }
        return ch
      }),
    }))
    return found
      ? { ...prev, teams, totalUnread: prev.totalUnread + 1 }
      : prev
  }

  if (msg.conversationId) {
    const preview = messagePreview(msg)
    const existing = prev.directMessages.find((d) => d.id === msg.conversationId)
    if (!existing) return prev

    const directMessages = sortDirectMessages(
      prev.directMessages.map((d) =>
        d.id === msg.conversationId
          ? {
              ...d,
              lastMessagePreview: preview,
              lastMessageAt: msg.createdAt,
              unreadCount: d.unreadCount + 1,
            }
          : d
      )
    )
    return {
      ...prev,
      directMessages,
      totalUnread: prev.totalUnread + 1,
    }
  }

  return prev
}

function sidebarContainsMessage(
  prev: CommunicationSidebarData,
  msg: CommunicationMessage
): boolean {
  if (msg.channelId) {
    return prev.teams.some((team) => team.channels.some((ch) => ch.id === msg.channelId))
  }
  if (msg.conversationId) {
    return prev.directMessages.some((d) => d.id === msg.conversationId)
  }
  return false
}

export function CommunicationPage() {
  const { user, organization } = useAuth()
  const { connected, refreshUnread } = useCommunication()
  const { refresh: refreshNotifications } = useNotifications()
  const socket = useCommunicationSocket()
  const [searchParams, setSearchParams] = useSearchParams()

  const [sidebarData, setSidebarData] = useState<CommunicationSidebarData | null>(null)
  const [sidebarLoading, setSidebarLoading] = useState(true)
  const [selection, setSelection] = useState<CommunicationSelection | null>(null)
  const [messages, setMessages] = useState<CommunicationMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<CommunicationMessage | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUserIdentity[]>([])
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [newMessageOpen, setNewMessageOpen] = useState(false)
  const [createChannelModal, setCreateChannelModal] = useState<{
    teamId: string
    teamName: string
  } | null>(null)
  const [editChannelModal, setEditChannelModal] = useState<{
    channel: CommunicationChannelSummary
    renameOnly: boolean
  } | null>(null)
  const [deleteChannelModal, setDeleteChannelModal] = useState<CommunicationChannelSummary | null>(
    null
  )
  const [accessNotice, setAccessNotice] = useState<string | null>(null)
  const [teamDrawerOpen, setTeamDrawerOpen] = useState(false)
  const [drawerTeam, setDrawerTeam] = useState<Team | null>(null)
  const [drawerOrgMembers, setDrawerOrgMembers] = useState<OrganizationMember[]>([])
  const [teamMembersRefreshKey, setTeamMembersRefreshKey] = useState(0)
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([])
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    searchParams.get('message')
  )

  const selectionRef = useRef(selection)
  const sidebarRef = useRef(sidebarData)
  const typingTimersRef = useRef<Map<string, number>>(new Map())
  const mentionCacheRef = useRef<Map<string, MentionCandidate[]>>(new Map())
  const deepLinkHandledRef = useRef<string | null>(null)

  const readOnly = user?.role === 'viewer'
  const canManageChannels = user?.role === 'admin' || user?.role === 'manager'
  const canModerate = canManageChannels
  const canManageTeams = canManageTeamMembers(user?.role)
  const orgId = organization?.id

  selectionRef.current = selection
  sidebarRef.current = sidebarData

  const loadSidebar = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) setSidebarLoading(true)
    try {
      const data = await communicationApi.getSidebar()
      setSidebarData(data)
    } catch {
      if (!silent) setSidebarData({ teams: [], directMessages: [], totalUnread: 0 })
    } finally {
      if (!silent) setSidebarLoading(false)
    }
  }, [])

  const markSelectionRead = useCallback(
    async (sel: CommunicationSelection, lastMessageId: string) => {
      if (sel.type === 'channel') {
        await communicationApi.markChannelRead(sel.channelId, lastMessageId)
      } else {
        await communicationApi.markConversationRead(sel.conversationId, lastMessageId)
      }
      setSidebarData((prev) => (prev ? clearSelectionUnread(prev, sel) : prev))
      await refreshUnread()
    },
    [refreshUnread]
  )

  const loadMessages = useCallback(
    async (sel: CommunicationSelection, before?: string) => {
      const isInitial = !before
      if (isInitial) setMessagesLoading(true)
      else setLoadingMore(true)

      try {
        const page =
          sel.type === 'channel'
            ? await communicationApi.listChannelMessages(sel.channelId, { before, limit: 30 })
            : await communicationApi.listConversationMessages(sel.conversationId, {
                before,
                limit: 30,
              })

        setNextCursor(page.nextCursor)
        setMessages((prev) => {
          if (isInitial) return page.messages
          const existing = new Set(prev.map((m) => m.id))
          const older = page.messages.filter((m) => !existing.has(m.id))
          return [...older, ...prev]
        })

        if (isInitial && page.messages.length > 0) {
          const last = page.messages[page.messages.length - 1]
          await markSelectionRead(sel, last.id)
        }
      } finally {
        if (isInitial) setMessagesLoading(false)
        else setLoadingMore(false)
      }
    },
    [markSelectionRead]
  )

  const joinRoom = useCallback((sel: CommunicationSelection | null) => {
    if (!socket?.connected || !sel) return
    if (sel.type === 'channel') {
      socket.emit('join-channel', sel.channelId)
    } else {
      socket.emit('join-conversation', sel.conversationId)
    }
  }, [socket])

  const leaveRoom = useCallback((sel: CommunicationSelection | null) => {
    if (!socket || !sel) return
    if (sel.type === 'channel') {
      socket.emit('leave-channel', sel.channelId)
    } else {
      socket.emit('leave-conversation', sel.conversationId)
    }
  }, [socket])

  const clearTypingState = useCallback(() => {
    for (const timer of typingTimersRef.current.values()) {
      window.clearTimeout(timer)
    }
    typingTimersRef.current.clear()
    setTypingUsers([])
  }, [])

  const handleAccessRevoked = useCallback(
    (payload: CommunicationAccessRevokedPayload) => {
      const sel = selectionRef.current
      const sidebar = sidebarRef.current

      if (payload.contextType === 'organization') {
        setSelection(null)
        setMessages([])
        setReplyTo(null)
        clearTypingState()
        setMobileShowChat(false)
        setTeamDrawerOpen(false)
        setDrawerTeam(null)
        setAccessNotice('You no longer have access to this organization.')
        loadSidebar()
        return
      }

      const revokedChannelIds = payload.channelIds ?? []
      const viewingRevokedChannel =
        sel?.type === 'channel' && revokedChannelIds.includes(sel.channelId)

      if (viewingRevokedChannel) {
        leaveRoom(sel)
        setMessages([])
        setReplyTo(null)
        clearTypingState()
        setMobileShowChat(false)
        setTeamDrawerOpen(false)
        setDrawerTeam(null)
        setAccessNotice('You no longer have access to this channel.')

        if (payload.teamId && sidebar) {
          const team = sidebar.teams.find((t) => t.id === payload.teamId)
          const general = team?.channels.find((c) => c.isGeneral)
          if (general) {
            setSelection(channelToSelection(payload.teamId, general))
          } else {
            setSelection(null)
          }
        } else {
          setSelection(null)
        }
      }

      loadSidebar()
    },
    [clearTypingState, leaveRoom, loadSidebar]
  )

  useEffect(() => {
    if (!orgId || !selection || !user?.id) {
      setMentionCandidates([])
      return
    }

    if (selection.type === 'direct') {
      const participant = selection.participant
      setMentionCandidates(
        participant && participant.id !== user.id
          ? [
              {
                id: participant.id,
                firstName: participant.firstName,
                lastName: participant.lastName,
                avatarUrl: participant.avatarUrl,
              },
            ]
          : []
      )
      return
    }

    const cacheKey = `channel:${selection.channelId}`
    const cached = mentionCacheRef.current.get(cacheKey)
    if (cached) {
      setMentionCandidates(cached.filter((candidate) => candidate.id !== user.id))
      return
    }

    let cancelled = false
    communicationApi
      .getChannelMentionCandidates(selection.channelId)
      .then((data) => {
        if (cancelled) return
        const candidates = data.members
          .map((member) => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            avatarUrl: member.avatarUrl,
          }))
          .filter((member) => member.id !== user.id)
        mentionCacheRef.current.set(cacheKey, candidates)
        setMentionCandidates(candidates)
      })
      .catch(() => {
        if (!cancelled) setMentionCandidates([])
      })

    return () => {
      cancelled = true
    }
  }, [selection, orgId, user?.id])

  useEffect(() => {
    if (!sidebarData || sidebarLoading) return

    const channelId = searchParams.get('channel')
    const conversationId = searchParams.get('conversation')
    const messageId = searchParams.get('message')
    if (!channelId && !conversationId) return

    const deepLinkKey = `${channelId ?? ''}|${conversationId ?? ''}|${messageId ?? ''}`
    if (deepLinkHandledRef.current === deepLinkKey) return

    if (channelId) {
      for (const team of sidebarData.teams) {
        const channel = team.channels.find((item) => item.id === channelId)
        if (channel) {
          setAccessNotice(null)
          setSelection(channelToSelection(team.id, channel))
          setMobileShowChat(true)
          if (messageId) setScrollToMessageId(messageId)
          deepLinkHandledRef.current = deepLinkKey
          setSearchParams({}, { replace: true })
          return
        }
      }
    }

    if (conversationId) {
      const dm = sidebarData.directMessages.find((item) => item.id === conversationId)
      if (dm) {
        setAccessNotice(null)
        setSelection(dmToSelection(dm))
        setMobileShowChat(true)
        if (messageId) setScrollToMessageId(messageId)
        deepLinkHandledRef.current = deepLinkKey
        setSearchParams({}, { replace: true })
      }
    }
  }, [sidebarData, sidebarLoading, searchParams, setSearchParams])

  useEffect(() => {
    setSelection(null)
    setMobileShowChat(false)
    setMessages([])
    setAccessNotice(null)
    setTeamDrawerOpen(false)
    setDrawerTeam(null)
    setDrawerOrgMembers([])
    mentionCacheRef.current.clear()
    deepLinkHandledRef.current = null
    loadSidebar()
  }, [organization?.id, loadSidebar])

  useEffect(() => {
    if (selection?.type === 'direct') {
      setTeamDrawerOpen(false)
      setDrawerTeam(null)
    }
  }, [selection])

  useEffect(() => {
    if (!teamDrawerOpen || selection?.type !== 'channel' || !orgId || !sidebarData) return
    const summary = sidebarData.teams.find((t) => t.id === selection.teamId)
    if (!summary) return
    setDrawerTeam((prev) => {
      if (prev?.id === summary.id && (prev.memberIds.length > 0 || prev.leadId !== undefined)) {
        return prev
      }
      return {
        id: summary.id,
        name: summary.name,
        organizationId: orgId,
        memberIds: prev?.id === summary.id ? prev.memberIds : [],
        description: prev?.id === summary.id ? prev.description : undefined,
        leadId: prev?.id === summary.id ? prev.leadId : undefined,
        lead: prev?.id === summary.id ? prev.lead : undefined,
      }
    })
  }, [teamDrawerOpen, selection, sidebarData, orgId])

  const refreshDrawerTeam = useCallback(
    async (teamId: string) => {
      if (!orgId) return
      try {
        const teams = await teamsApi.list(orgId)
        const team = teams.find((t) => t.id === teamId)
        if (team) setDrawerTeam(team)
      } catch {
        /* drawer keeps last known team snapshot */
      }
    },
    [orgId]
  )

  useEffect(() => {
    if (!teamDrawerOpen || !orgId || selection?.type !== 'channel') return

    const teamId = selection.teamId
    let cancelled = false
    async function loadDrawerData() {
      try {
        const [membersData, teamsData] = await Promise.all([
          organizationsApi.listMembers(orgId!),
          teamsApi.list(orgId!),
        ])
        if (cancelled) return
        setDrawerOrgMembers(membersData)
        const team = teamsData.find((t) => t.id === teamId)
        if (team) setDrawerTeam(team)
      } catch {
        if (!cancelled) {
          const summary = sidebarRef.current?.teams.find((t) => t.id === teamId)
          if (summary) {
            setDrawerTeam({
              id: summary.id,
              name: summary.name,
              organizationId: orgId!,
              memberIds: [],
            })
          }
        }
      }
    }

    loadDrawerData()
    return () => {
      cancelled = true
    }
  }, [teamDrawerOpen, orgId, selection?.type === 'channel' ? selection.teamId : null])

  function handleDrawerTeamUpdated(team: Team) {
    setDrawerTeam(team)
    setTeamMembersRefreshKey((k) => k + 1)
    refreshDrawerTeam(team.id)
  }

  useEffect(() => {
    setMessages([])
    setNextCursor(null)
    setReplyTo(null)
    clearTypingState()

    if (!selection) return

    loadMessages(selection)
    joinRoom(selection)

    return () => leaveRoom(selection)
  }, [selection, joinRoom, leaveRoom, loadMessages, clearTypingState])

  useEffect(() => {
    if (!socket) return

    const matchesSelection = (msg: CommunicationMessage) => {
      const sel = selectionRef.current
      if (!sel) return false
      if (sel.type === 'channel') return msg.channelId === sel.channelId
      return msg.conversationId === sel.conversationId
    }

    const addTypingUser = (identity: TypingUserIdentity) => {
      if (identity.userId === user?.id) return
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === identity.userId)) return prev
        return [...prev, identity]
      })
      const existing = typingTimersRef.current.get(identity.userId)
      if (existing) window.clearTimeout(existing)
      typingTimersRef.current.set(
        identity.userId,
        window.setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== identity.userId))
          typingTimersRef.current.delete(identity.userId)
        }, 4000)
      )
    }

    const removeTypingUser = (userId: string) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId))
      const t = typingTimersRef.current.get(userId)
      if (t) window.clearTimeout(t)
      typingTimersRef.current.delete(userId)
    }

    const onNew = (msg: CommunicationMessage) => {
      if (!matchesSelection(msg)) {
        const prev = sidebarRef.current
        if (prev && sidebarContainsMessage(prev, msg)) {
          setSidebarData(applySidebarIncomingMessage(prev, msg))
        } else {
          loadSidebar({ silent: true })
        }
        refreshUnread()
        return
      }

      setMessages((prev) => upsertMessage(prev, msg))

      if (msg.mentions?.some((mention) => mention.userId === user?.id)) {
        refreshNotifications()
      }

      const sel = selectionRef.current
      if (sel && msg.sender?.id !== user?.id) {
        markSelectionRead(sel, msg.id)
      } else if (sel && msg.sender?.id === user?.id) {
        setSidebarData((prev) =>
          prev ? applySidebarAfterOwnMessage(prev, sel, msg) : prev
        )
      }
    }

    const onUpdated = (msg: CommunicationMessage) => {
      if (!matchesSelection(msg)) return
      setMessages((prev) => upsertMessage(prev, msg))
    }

    const onDeleted = (payload: { id: string; deletedAt: string }) => {
      setMessages((prev) => applyDeleted(prev, payload))
    }

    const onReaction = (payload: { messageId: string; message: CommunicationMessage | null }) => {
      if (!payload.message || !matchesSelection(payload.message)) return
      setMessages((prev) => upsertMessage(prev, payload.message!))
    }

    const onReadReceipt = (payload: {
      contextType: 'channel' | 'direct'
      channelId?: string
      conversationId?: string
      readerId: string
      lastReadMessageId?: string
      lastReadAt: string
    }) => {
      if (payload.readerId === user?.id) return

      const sel = selectionRef.current
      if (!sel) return
      if (
        sel.type === 'channel' &&
        (payload.contextType !== 'channel' || payload.channelId !== sel.channelId)
      ) {
        return
      }
      if (
        sel.type === 'direct' &&
        (payload.contextType !== 'direct' || payload.conversationId !== sel.conversationId)
      ) {
        return
      }

      const readAtMs = new Date(payload.lastReadAt).getTime()
      setMessages((prev) =>
        prev.map((message) => {
          if (message.sender?.id !== user?.id || message.readReceipt === 'read') return message
          const messageTime = new Date(message.createdAt).getTime()
          if (payload.lastReadMessageId === message.id || messageTime <= readAtMs) {
            return { ...message, readReceipt: 'read' }
          }
          return message
        })
      )
    }

    const onTypingStart = (payload: {
      contextType: 'channel' | 'direct'
      contextId: string
      user: TypingUserIdentity
    }) => {
      const sel = selectionRef.current
      if (!sel || !payload.user) return
      const contextMatch =
        sel.type === 'channel'
          ? payload.contextType === 'channel' && payload.contextId === sel.channelId
          : payload.contextType === 'direct' && payload.contextId === sel.conversationId
      if (!contextMatch) return
      addTypingUser(payload.user)
    }

    const onTypingStop = (payload: { userId: string }) => {
      removeTypingUser(payload.userId)
    }

    const onReconnect = () => {
      joinRoom(selectionRef.current)
      if (selectionRef.current) loadMessages(selectionRef.current)
      loadSidebar({ silent: sidebarRef.current != null })
      refreshUnread()
    }

    const onTeamAccessUpdated = (payload: { teamId: string; organizationId: string }) => {
      loadSidebar({ silent: true })
      const sel = selectionRef.current
      if (sel?.type === 'channel' && sel.teamId === payload.teamId) {
        setTeamMembersRefreshKey((k) => k + 1)
        refreshDrawerTeam(payload.teamId)
        mentionCacheRef.current.delete(`channel:${sel.channelId}`)
        communicationApi
          .getChannelMentionCandidates(sel.channelId)
          .then((data) => {
            const candidates = data.members.map((member) => ({
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              avatarUrl: member.avatarUrl,
            }))
            mentionCacheRef.current.set(`channel:${sel.channelId}`, candidates)
            if (user?.id) {
              setMentionCandidates(candidates.filter((candidate) => candidate.id !== user.id))
            }
          })
          .catch(() => {})
      }
    }

    socket.on('message:new', onNew)
    socket.on('message:updated', onUpdated)
    socket.on('message:deleted', onDeleted)
    socket.on('message:reaction', onReaction)
    socket.on('communication:read-receipt', onReadReceipt)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)
    socket.on('communication:access-revoked', handleAccessRevoked)
    socket.on('communication:team-access-updated', onTeamAccessUpdated)
    socket.on('connect', onReconnect)

    return () => {
      socket.off('message:new', onNew)
      socket.off('message:updated', onUpdated)
      socket.off('message:deleted', onDeleted)
      socket.off('message:reaction', onReaction)
      socket.off('communication:read-receipt', onReadReceipt)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
      socket.off('communication:access-revoked', handleAccessRevoked)
      socket.off('communication:team-access-updated', onTeamAccessUpdated)
      socket.off('connect', onReconnect)
    }
  }, [
    socket,
    user?.id,
    loadMessages,
    loadSidebar,
    refreshUnread,
    joinRoom,
    markSelectionRead,
    handleAccessRevoked,
    refreshDrawerTeam,
    refreshNotifications,
  ])

  const typingLabel = useMemo(() => formatTypingLabel(typingUsers), [typingUsers])

  function selectChannel(teamId: string, channel: CommunicationChannelSummary) {
    setAccessNotice(null)
    setSelection(channelToSelection(teamId, channel))
    setMobileShowChat(true)
  }

  function selectDirect(dm: DirectMessageSummary) {
    setAccessNotice(null)
    setSelection(dmToSelection(dm))
    setMobileShowChat(true)
  }

  async function handleSend(content: string, file?: File, mentions?: MessageMentionInput[]) {
    if (!selection) return
    const payload = {
      content: content || undefined,
      replyToMessageId: replyTo?.id,
      mentions,
    }

    let message: CommunicationMessage
    if (selection.type === 'channel') {
      message = await communicationApi.sendChannelMessage(selection.channelId, payload, file)
    } else {
      message = await communicationApi.sendConversationMessage(selection.conversationId, payload, file)
    }

    setMessages((prev) => upsertMessage(prev, message))
    setReplyTo(null)
    setSidebarData((prev) =>
      prev && selection ? applySidebarAfterOwnMessage(prev, selection, message) : prev
    )
    await markSelectionRead(selection, message.id)
  }

  async function handleEdit(
    message: CommunicationMessage,
    content: string,
    mentions?: MessageMentionInput[]
  ) {
    const updated = await communicationApi.editMessage(message.id, { content, mentions })
    setMessages((prev) => upsertMessage(prev, updated))
  }

  async function handleDelete(message: CommunicationMessage) {
    await communicationApi.deleteMessage(message.id)
    setMessages((prev) =>
      applyDeleted(prev, { id: message.id, deletedAt: new Date().toISOString() })
    )
  }

  async function handleReact(message: CommunicationMessage, emoji: string) {
    const existing = message.reactions.find((r) => r.emoji === emoji)
    const updated =
      existing?.reactedByMe
        ? await communicationApi.removeReaction(message.id, emoji)
        : await communicationApi.addReaction(message.id, emoji)
    setMessages((prev) => upsertMessage(prev, updated))
  }

  function emitTypingStart() {
    if (!socket?.connected || !selection || readOnly) return
    const payload =
      selection.type === 'channel'
        ? { contextType: 'channel' as const, contextId: selection.channelId }
        : { contextType: 'direct' as const, contextId: selection.conversationId }
    socket.emit('typing:start', payload)
  }

  function emitTypingStop() {
    if (!socket?.connected || !selection) return
    const payload =
      selection.type === 'channel'
        ? { contextType: 'channel' as const, contextId: selection.channelId }
        : { contextType: 'direct' as const, contextId: selection.conversationId }
    socket.emit('typing:stop', payload)
  }

  async function handleStartDirect(targetUserId: string) {
    const result = await communicationApi.startDirect(targetUserId)
    await loadSidebar({ silent: true })
    const dm: DirectMessageSummary = {
      id: result.id,
      participant: result.participant,
      lastMessagePreview: '',
      lastMessageAt: null,
      unreadCount: 0,
    }
    selectDirect(dm)
  }

  function handleChannelUpdated(updated: CommunicationChannelSummary) {
    setSidebarData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        teams: prev.teams.map((team) => ({
          ...team,
          channels: team.channels.map((ch) =>
            ch.id === updated.id
              ? { ...ch, name: updated.name, slug: updated.slug, description: updated.description }
              : ch
          ),
        })),
      }
    })
    setSelection((prev) => {
      if (prev?.type === 'channel' && prev.channelId === updated.id) {
        return {
          ...prev,
          title: updated.name,
          slug: updated.slug,
          description: updated.description,
        }
      }
      return prev
    })
  }

  function handleChannelDeleted(deleted: CommunicationChannelSummary) {
    const sidebar = sidebarRef.current
    const sel = selectionRef.current

    setSidebarData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        teams: prev.teams.map((team) => ({
          ...team,
          channels: team.channels.filter((ch) => ch.id !== deleted.id),
        })),
      }
    })

    if (sel?.type === 'channel' && sel.channelId === deleted.id) {
      leaveRoom(sel)
      setMessages([])
      setReplyTo(null)
      clearTypingState()

      const team = sidebar?.teams.find((t) => t.id === deleted.teamId)
      const general = team?.channels.find((c) => c.isGeneral && c.id !== deleted.id)
      if (general) {
        setSelection(channelToSelection(deleted.teamId, general))
      } else {
        setSelection(null)
        setMobileShowChat(false)
      }
    }

    loadSidebar({ silent: true })
  }

  const teamSubtitle =
    selection?.type === 'channel'
      ? sidebarData?.teams.find((t) => t.id === selection.teamId)?.name
      : undefined

  function openTeamDetails() {
    if (selection?.type !== 'channel') return
    if (orgId && sidebarData) {
      const summary = sidebarData.teams.find((t) => t.id === selection.teamId)
      if (summary) {
        setDrawerTeam({
          id: summary.id,
          name: summary.name,
          organizationId: orgId,
          memberIds: [],
        })
      }
    }
    setTeamDrawerOpen(true)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f8f7ff] p-3">
      {accessNotice && (
        <div className="mb-3 shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {accessNotice}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-[#ded9f6] bg-white shadow-[0_18px_48px_rgba(76,57,129,0.08)]">
        <div
          className={cn(
            'flex min-h-0 w-full shrink-0 flex-col border-r border-[#e4def8] bg-[#fbf9ff] lg:w-[300px] xl:w-[320px]',
            mobileShowChat ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e4def8] px-4">
            <h1 className="text-[15px] font-semibold tracking-tight text-[#07111f]">Communication</h1>
            <span className="rounded-full bg-[#eee8ff] px-2.5 py-1 text-[11px] font-semibold text-[#6d45c2]">
              {sidebarData?.totalUnread ?? 0} unread
            </span>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <CommunicationSidebar
            data={sidebarData}
            selection={selection}
            loading={sidebarLoading}
            canManageChannels={canManageChannels}
            onSelectChannel={selectChannel}
            onSelectDirect={selectDirect}
            onNewMessage={() => setNewMessageOpen(true)}
            onCreateChannel={(teamId, teamName) => setCreateChannelModal({ teamId, teamName })}
            onRenameChannel={(channel) => setEditChannelModal({ channel, renameOnly: true })}
            onEditChannel={(channel) => setEditChannelModal({ channel, renameOnly: false })}
            onDeleteChannel={(channel) => setDeleteChannelModal(channel)}
          />
          </div>
        </div>

        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#f7f8fb]',
            mobileShowChat ? 'flex' : 'hidden lg:flex'
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#fbfcff]">
            <ChatHeader
              selection={selection}
              subtitle={teamSubtitle}
              connected={connected}
              showBack={mobileShowChat}
              onBack={() => setMobileShowChat(false)}
              onOpenTeamDetails={
                selection?.type === 'channel' ? openTeamDetails : undefined
              }
            />

            {selection ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f6f7fb]">
                  <MessageList
                    conversationKey={selectionKey(selection)}
                    messages={messages}
                    loading={messagesLoading}
                    loadingMore={loadingMore}
                    hasMore={Boolean(nextCursor)}
                    readOnly={readOnly}
                    currentUserId={user?.id}
                    canModerate={canModerate}
                    mentionCandidates={mentionCandidates}
                    scrollToMessageId={scrollToMessageId}
                    onLoadMore={() => {
                      if (nextCursor && selection) loadMessages(selection, nextCursor)
                    }}
                    onReply={setReplyTo}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReact={handleReact}
                  />

                  {typingLabel && (
                    <p className="shrink-0 px-5 pb-2 text-xs font-medium text-[#6d45c2]">{typingLabel}</p>
                  )}
                </div>

                <MessageComposer
                  disabled={readOnly}
                  replyTo={replyTo}
                  mentionCandidates={mentionCandidates}
                  onCancelReply={() => setReplyTo(null)}
                  onSend={handleSend}
                  onTypingStart={emitTypingStart}
                  onTypingStop={emitTypingStop}
                />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee8ff] text-[#6d45c2]">
                    <MessageSquareText className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#07111f]">
                    Select a conversation
                  </p>
                  <p className="mt-1 text-sm text-[#667085]">
                    Choose a team channel or direct message to start messaging.
                  </p>
                </div>
              </div>
            )}
          </div>

          {teamDrawerOpen && selection?.type === 'channel' && orgId && drawerTeam && (
              <TeamDetailsDrawer
                open
                onClose={() => setTeamDrawerOpen(false)}
                organizationId={orgId}
                team={drawerTeam}
                channelSlug={selection.slug}
                channelDescription={selection.description}
                orgMembers={drawerOrgMembers}
                canManage={canManageTeams}
                membersRefreshKey={teamMembersRefreshKey}
                onTeamUpdated={handleDrawerTeamUpdated}
              />
            )}
        </div>
      </div>

      <NewMessageModal
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onSelect={handleStartDirect}
      />

      {createChannelModal && (
        <ChannelModal
          open
          mode="create"
          teamId={createChannelModal.teamId}
          teamName={createChannelModal.teamName}
          onClose={() => setCreateChannelModal(null)}
          onSuccess={() => loadSidebar()}
        />
      )}

      {editChannelModal && (
        <ChannelModal
          open
          mode="edit"
          channel={editChannelModal.channel}
          renameOnly={editChannelModal.renameOnly}
          onClose={() => setEditChannelModal(null)}
          onSuccess={(updated) => {
            if (updated) handleChannelUpdated(updated)
          }}
        />
      )}

      {deleteChannelModal && (
        <DeleteChannelModal
          open
          channel={deleteChannelModal}
          onClose={() => setDeleteChannelModal(null)}
          onSuccess={() => handleChannelDeleted(deleteChannelModal)}
        />
      )}
    </div>
  )
}
