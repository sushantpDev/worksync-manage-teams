import { ChevronDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommunicationMessage } from '../../types'
import { formatMessageDateSeparator, isSameCalendarDay } from '../../lib/utils'
import { MessageItem } from './MessageItem'

const GROUP_WINDOW_MS = 5 * 60 * 1000
const NEAR_BOTTOM_THRESHOLD = 120

function shouldShowHeader(messages: CommunicationMessage[], index: number): boolean {
  if (index === 0) return true
  const current = messages[index]
  const previous = messages[index - 1]
  if (!isSameCalendarDay(current.createdAt, previous.createdAt)) return true
  if (current.sender?.id !== previous.sender?.id) return true
  const gap = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime()
  return gap > GROUP_WINDOW_MS
}

function shouldShowDateSeparator(messages: CommunicationMessage[], index: number): boolean {
  if (index === 0) return true
  return !isSameCalendarDay(messages[index].createdAt, messages[index - 1].createdAt)
}

export function MessageList({
  messages,
  loading,
  loadingMore,
  hasMore,
  conversationKey,
  readOnly,
  currentUserId,
  canModerate,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onScrollNearBottomChange,
  mentionCandidates,
  scrollToMessageId,
}: {
  messages: CommunicationMessage[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  conversationKey: string
  readOnly?: boolean
  currentUserId?: string
  canModerate?: boolean
  onLoadMore: () => void
  onReply: (message: CommunicationMessage) => void
  onEdit: (
    message: CommunicationMessage,
    content: string,
    mentions?: import('../../lib/api').MessageMentionInput[]
  ) => Promise<void>
  onDelete: (message: CommunicationMessage) => Promise<void>
  onReact: (message: CommunicationMessage, emoji: string) => Promise<void>
  onScrollNearBottomChange?: (nearBottom: boolean) => void
  mentionCandidates: import('../../lib/mentionUtils').MentionCandidate[]
  scrollToMessageId?: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef(0)
  const initialScrollDoneRef = useRef(false)
  const prevMessageCountRef = useRef(0)
  const isNearBottomRef = useRef(true)
  const [showNewMessages, setShowNewMessages] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    isNearBottomRef.current = true
    onScrollNearBottomChange?.(true)
    setShowNewMessages(false)
  }, [onScrollNearBottomChange])

  const updateNearBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD
    isNearBottomRef.current = nearBottom
    onScrollNearBottomChange?.(nearBottom)
    if (nearBottom) setShowNewMessages(false)
  }, [onScrollNearBottomChange])

  useEffect(() => {
    initialScrollDoneRef.current = false
    prevMessageCountRef.current = 0
    isNearBottomRef.current = true
    setShowNewMessages(false)
  }, [conversationKey])

  useEffect(() => {
    const el = containerRef.current
    if (!el || loading) return

    if (!initialScrollDoneRef.current && messages.length > 0) {
      scrollToBottom()
      initialScrollDoneRef.current = true
      prevMessageCountRef.current = messages.length
      return
    }

    if (loadingMore && prevScrollHeightRef.current > 0) {
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current
      prevScrollHeightRef.current = 0
      return
    }

    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1]
      const isOwnMessage = lastMessage?.sender?.id === currentUserId
      if (isNearBottomRef.current || isOwnMessage) {
        scrollToBottom()
      } else {
        setShowNewMessages(true)
      }
    }

    prevMessageCountRef.current = messages.length
  }, [messages, loading, loadingMore, currentUserId, scrollToBottom])

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`message-${messageId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(messageId)
    window.setTimeout(() => setHighlightId(null), 2000)
  }, [])

  useEffect(() => {
    if (!scrollToMessageId || loading) return
    if (messages.some((message) => message.id === scrollToMessageId)) {
      scrollToMessage(scrollToMessageId)
    }
  }, [scrollToMessageId, messages, loading, scrollToMessage])

  function handleScroll() {
    updateNearBottom()
    const el = containerRef.current
    if (!el || loadingMore || !hasMore) return
    if (el.scrollTop < 80) {
      prevScrollHeightRef.current = el.scrollHeight
      onLoadMore()
    }
  }

  if (loading) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <div className="rounded-3xl border border-dashed border-[#d9d2f4] bg-white/70 px-8 py-7 shadow-[0_14px_38px_rgba(76,57,129,0.06)]">
          <p className="text-sm font-semibold text-[#07111f]">No messages yet</p>
          <p className="mt-1 text-sm text-[#667085]">Start the conversation with a quick update.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-5"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
          </div>
        )}
        {messages.map((message, index) => {
          const isOwn = message.sender?.id === currentUserId
          const mentionedMe =
            Boolean(currentUserId) &&
            !isOwn &&
            (message.mentions ?? []).some((mention) => mention.userId === currentUserId)
          return (
            <div key={message.id}>
              {shouldShowDateSeparator(messages, index) && (
                <div className="my-4 flex items-center gap-3 px-5">
                  <div className="h-px flex-1 bg-[#e7eaf0]" />
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#667085] shadow-sm">
                    {formatMessageDateSeparator(message.createdAt)}
                  </span>
                  <div className="h-px flex-1 bg-[#e7eaf0]" />
                </div>
              )}
              <MessageItem
                message={message}
                readOnly={readOnly}
                showHeader={shouldShowHeader(messages, index)}
                highlighted={highlightId === message.id}
                mentionedMe={mentionedMe}
                mentionCandidates={mentionCandidates}
                canEdit={isOwn && !readOnly}
                canDelete={(isOwn || canModerate) && !readOnly}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onReact={onReact}
                onScrollToReply={scrollToMessage}
              />
            </div>
          )
        })}
      </div>

      {showNewMessages && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#ded9f6] bg-white px-3 py-1.5 text-xs font-medium text-[#6d45c2] shadow-md hover:bg-[#f4f1ff]"
          >
            New messages
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
