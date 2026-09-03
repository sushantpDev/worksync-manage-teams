import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CommunicationMessage } from '../../types'
import type { MessageMentionInput } from '../../lib/api'
import {
  draftsFromMessageMentions,
  resolveMentionsForSend,
  type MentionCandidate,
  type MentionDraft,
} from '../../lib/mentionUtils'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { MessageAttachment } from './MessageAttachment'
import { MessageContent } from './MessageContent'
import { MessageReadReceipt } from './MessageReadReceipt'
import { MentionTextarea } from './MentionTextarea'

const REACTIONS = ['👍', '❤️', '🎉', '👀', '✅']

export function MessageItem({
  message,
  readOnly,
  showHeader,
  highlighted,
  mentionedMe,
  mentionCandidates,
  canEdit,
  canDelete,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onScrollToReply,
}: {
  message: CommunicationMessage
  readOnly?: boolean
  showHeader?: boolean
  highlighted?: boolean
  mentionedMe?: boolean
  mentionCandidates: MentionCandidate[]
  canEdit?: boolean
  canDelete?: boolean
  onReply: (message: CommunicationMessage) => void
  onEdit: (
    message: CommunicationMessage,
    content: string,
    mentions?: MessageMentionInput[]
  ) => Promise<void>
  onDelete: (message: CommunicationMessage) => Promise<void>
  onReact: (message: CommunicationMessage, emoji: string) => Promise<void>
  onScrollToReply?: (messageId: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [editMentionDrafts, setEditMentionDrafts] = useState<MentionDraft[]>([])
  const [showReactions, setShowReactions] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  const actionsOpen = menuOpen || showReactions

  useEffect(() => {
    if (!actionsOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (actionsRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
      setShowReactions(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setShowReactions(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [actionsOpen])

  useEffect(() => {
    if (!editing) {
      setEditContent(message.content)
      setEditMentionDrafts(draftsFromMessageMentions(message.mentions ?? []))
    }
  }, [message, editing])

  const senderName = message.sender
    ? `${message.sender.firstName} ${message.sender.lastName}`
    : 'Unknown'
  const isDeleted = Boolean(message.deletedAt)
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  async function saveEdit() {
    const mentions = resolveMentionsForSend(editContent, editMentionDrafts)
    await onEdit(message, editContent, mentions)
    setEditing(false)
  }

  const replyTargetId = message.replyTo?.id

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'group relative px-5 py-2 transition-colors hover:bg-white/70',
        highlighted && 'bg-[#f4f1ff] ring-1 ring-inset ring-[#6d45c2]/20',
        mentionedMe && !highlighted && 'bg-[#f4f1ff]/70'
      )}
    >
      {showHeader && (
        <div className="mb-1 flex items-center gap-2">
          <Avatar
            userId={message.sender?.id}
            name={senderName}
            src={message.sender?.avatarUrl}
            size="sm"
          />
          <span className="text-sm font-semibold text-text-primary">{senderName}</span>
          <span className="text-xs text-text-muted">{time}</span>
          {message.readReceipt && (
            <MessageReadReceipt status={message.readReceipt} />
          )}
          {message.editedAt && !isDeleted && (
            <span className="text-xs text-text-muted">(edited)</span>
          )}
        </div>
      )}

      {!showHeader && (
        <div className="mb-0.5 flex items-center gap-1 pl-10 text-xs text-text-muted">
          {time}
          {message.readReceipt && (
            <MessageReadReceipt status={message.readReceipt} />
          )}
          {message.editedAt && !isDeleted && ' · edited'}
        </div>
      )}

      <div className="pl-10">
        {message.replyTo && (
          <button
            type="button"
            onClick={() => replyTargetId && onScrollToReply?.(replyTargetId)}
            className="mb-2 w-full cursor-pointer rounded-xl border-l-2 border-[#6d45c2]/45 bg-white px-3 py-2 text-left text-xs shadow-sm hover:bg-[#fbfcff]"
          >
            <p className="font-medium text-text-primary">
              {message.replyTo.sender
                ? `${message.replyTo.sender.firstName} ${message.replyTo.sender.lastName}`
                : 'Unknown'}
            </p>
            <p className="text-text-secondary">
              {message.replyTo.deletedAt ? 'Deleted message' : message.replyTo.content}
            </p>
          </button>
        )}

        {isDeleted ? (
          <p className="text-sm italic text-text-muted">This message was deleted</p>
        ) : editing ? (
          <div className="space-y-2">
            <MentionTextarea
              value={editContent}
              onChange={setEditContent}
              mentionCandidates={mentionCandidates}
              mentionDrafts={editMentionDrafts}
              onMentionDraftsChange={setEditMentionDrafts}
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="primary" onClick={saveEdit}>
                Save
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {message.content && (
              <MessageContent content={message.content} mentions={message.mentions ?? []} />
            )}
            {message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <MessageAttachment
                    key={attachment._id ?? attachment.publicId}
                    messageId={message.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!isDeleted && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReact(message, reaction.emoji)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs shadow-sm',
                  reaction.reactedByMe
                    ? 'border-[#6d45c2] bg-[#f4f1ff]'
                    : 'border-[#e7eaf0] bg-white'
                )}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {!readOnly && !isDeleted && (
        <div ref={actionsRef} className="absolute right-3 top-1 z-10">
          <div
            className={cn(
              'items-center gap-1 rounded-xl border border-[#e7eaf0] bg-white p-1 shadow-sm',
              actionsOpen ? 'flex' : 'hidden group-hover:flex'
            )}
          >
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs hover:bg-[#f4f1ff]"
              onClick={() => {
                setMenuOpen(false)
                setShowReactions(false)
                onReply(message)
              }}
            >
              Reply
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs hover:bg-[#f4f1ff]"
              onClick={() => {
                setMenuOpen(false)
                setShowReactions((v) => !v)
              }}
            >
              React
            </button>
            {(canEdit || canDelete) && (
              <button
                type="button"
                className="rounded-lg p-1 hover:bg-[#f4f1ff]"
                onClick={() => {
                  setShowReactions(false)
                  setMenuOpen((v) => !v)
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>

          {showReactions && (
            <div className="absolute right-0 top-full mt-1 flex gap-1 rounded-xl border border-[#e7eaf0] bg-white p-1 shadow-sm">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded-lg px-2 py-1 hover:bg-[#f4f1ff]"
                  onClick={() => {
                    onReact(message, emoji)
                    setShowReactions(false)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {menuOpen && (canEdit || canDelete) && (
            <div className="absolute right-0 top-full mt-1 min-w-[8rem] rounded-xl border border-[#e7eaf0] bg-white py-1 shadow-lg">
              {canEdit && (
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f4f1ff]"
                  onClick={() => {
                    setEditing(true)
                    setEditContent(message.content)
                    setEditMentionDrafts(draftsFromMessageMentions(message.mentions ?? []))
                    setMenuOpen(false)
                  }}
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    onDelete(message)
                    setMenuOpen(false)
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
