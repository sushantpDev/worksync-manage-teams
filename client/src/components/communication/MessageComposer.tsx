import { Loader2, Paperclip, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { resolveMentionsForSend, type MentionCandidate, type MentionDraft } from '../../lib/mentionUtils'
import type { MessageMentionInput } from '../../lib/api'
import { TASK_ATTACHMENT_ACCEPT, validateTaskAttachmentFile } from '../../lib/validation'
import { cn } from '../../lib/utils'
import type { CommunicationMessage } from '../../types'
import { ComposerEmojiPicker } from './ComposerEmojiPicker'
import { MentionTextarea } from './MentionTextarea'
import { ReplyPreview } from './ReplyPreview'

export function MessageComposer({
  disabled,
  replyTo,
  mentionCandidates,
  onCancelReply,
  onSend,
  onTypingStart,
  onTypingStop,
}: {
  disabled?: boolean
  replyTo?: CommunicationMessage | null
  mentionCandidates: MentionCandidate[]
  onCancelReply?: () => void
  onSend: (content: string, file?: File, mentions?: MessageMentionInput[]) => Promise<void>
  onTypingStart?: () => void
  onTypingStop?: () => void
}) {
  const [content, setContent] = useState('')
  const [mentionDrafts, setMentionDrafts] = useState<MentionDraft[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<number | null>(null)

  const canSend = Boolean(content.trim()) && !disabled && !sending

  function handleTyping() {
    onTypingStart?.()
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = window.setTimeout(() => onTypingStop?.(), 2000)
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? content.length
    const end = textarea?.selectionEnd ?? content.length
    const nextContent = `${content.slice(0, start)}${emoji}${content.slice(end)}`
    setContent(nextContent)
    handleTyping()

    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      const cursor = start + emoji.length
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(cursor, cursor)
    })
  }

  async function submitMessage(trimmed: string, file?: File) {
    const mentions = resolveMentionsForSend(trimmed, mentionDrafts)
    setContent('')
    setMentionDrafts([])
    onCancelReply?.()
    onTypingStop?.()
    await onSend(trimmed, file, mentions)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || disabled || sending) return

    setSending(true)
    setError(null)
    try {
      await submitMessage(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function handleFileChange(files: FileList | null) {
    const file = files?.[0]
    if (!file || disabled || sending) return

    const validationError = validateTaskAttachmentFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSending(true)
    setError(null)
    try {
      await submitMessage(content.trim(), file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload attachment')
    } finally {
      setSending(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="shrink-0 border-t border-[#e7eaf0] bg-white px-5 py-4">
      {replyTo && (
        <ReplyPreview message={replyTo} onCancel={() => onCancelReply?.()} />
      )}
      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept={TASK_ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />

        <div
          className={cn(
            'flex items-end gap-1 rounded-2xl border bg-[#fbfcff] px-2 py-2 shadow-sm transition-all',
            'border-[#dfe3ea] focus-within:border-[#6d45c2]/35 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#6d45c2]/10',
            disabled && 'opacity-60'
          )}
        >
          <button
            type="button"
            disabled={disabled || sending}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add attachment"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#667085] transition-colors hover:bg-[#f4f1ff] hover:text-[#6d45c2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>

          <ComposerEmojiPicker disabled={disabled || sending} onSelect={insertEmoji} />

          <MentionTextarea
            value={content}
            onChange={setContent}
            mentionCandidates={mentionCandidates}
            mentionDrafts={mentionDrafts}
            onMentionDraftsChange={setMentionDrafts}
            disabled={disabled || sending}
            placeholder={disabled ? 'You cannot send messages' : 'Type a message…'}
            inputRef={textareaRef}
            className="max-h-28 min-h-[36px] w-full resize-none border-0 bg-transparent px-2 py-2 text-[13px] leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
            onKeyDown={handleKeyDown}
            onTyping={handleTyping}
          />

          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              'mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
              canSend
                ? 'bg-[#111827] text-white hover:bg-[#2f3542]'
                : 'bg-[#eef1f5] text-[#98a2b3]'
            )}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
