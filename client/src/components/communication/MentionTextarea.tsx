import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  filterMentionCandidates,
  getMentionQuery,
  insertMentionAt,
  mentionDisplayName,
  pruneMentionDrafts,
  type MentionCandidate,
  type MentionDraft,
} from '../../lib/mentionUtils'
import { MentionAutocomplete } from './MentionAutocomplete'

export function MentionTextarea({
  value,
  onChange,
  mentionCandidates,
  mentionDrafts,
  onMentionDraftsChange,
  disabled,
  placeholder,
  rows = 1,
  className,
  onKeyDown,
  onTyping,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  mentionCandidates: MentionCandidate[]
  mentionDrafts: MentionDraft[]
  onMentionDraftsChange: (drafts: MentionDraft[]) => void
  disabled?: boolean
  placeholder?: string
  rows?: number
  className?: string
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onTyping?: () => void
  inputRef?: RefObject<HTMLTextAreaElement | null>
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionTriggerStart, setMentionTriggerStart] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = filterMentionCandidates(mentionCandidates, mentionQuery)

  useEffect(() => {
    setActiveIndex(0)
  }, [mentionQuery, mentionCandidates.length])

  function updateMentionState(
    nextValue: string,
    cursor: number,
    drafts: MentionDraft[] = mentionDrafts
  ) {
    const mention = getMentionQuery(nextValue, cursor, drafts)
    if (mention && mentionCandidates.length > 0) {
      setMentionOpen(true)
      setMentionQuery(mention.query)
      setMentionTriggerStart(mention.triggerStart)
    } else {
      setMentionOpen(false)
      setMentionQuery('')
    }
    onMentionDraftsChange(pruneMentionDrafts(nextValue, drafts))
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value
    onChange(nextValue)
    updateMentionState(nextValue, event.target.selectionStart ?? nextValue.length)
    onTyping?.()
  }

  function selectCandidate(candidate: MentionCandidate) {
    const textarea = textareaRef.current
    const cursor = textarea?.selectionStart ?? value.length
    const displayName = mentionDisplayName(candidate)
    const { nextContent, nextCursor } = insertMentionAt(
      value,
      cursor,
      mentionTriggerStart,
      displayName
    )

    const nextDrafts = [
      ...mentionDrafts.filter((draft) => draft.userId !== candidate.id),
      { userId: candidate.id, displayName },
    ]

    onChange(nextContent)
    onMentionDraftsChange(nextDrafts)
    setMentionOpen(false)
    setMentionQuery('')

    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(nextCursor, nextCursor)
      updateMentionState(nextContent, nextCursor, nextDrafts)
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen && filtered.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % filtered.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        selectCandidate(filtered[activeIndex])
        return
      }
    }

    if (event.key === 'Escape' && mentionOpen) {
      event.preventDefault()
      setMentionOpen(false)
      return
    }

    if (event.key === ' ' && mentionOpen) {
      setMentionOpen(false)
      setMentionQuery('')
    }

    onKeyDown?.(event)
  }

  return (
    <div className="relative min-w-0 flex-1">
      {mentionOpen && (
        <MentionAutocomplete
          candidates={filtered}
          activeIndex={activeIndex}
          onSelect={selectCandidate}
          onHover={setActiveIndex}
        />
      )}
      <textarea
        ref={(element) => {
          textareaRef.current = element
          if (inputRef) inputRef.current = element
        }}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(event) =>
          updateMentionState(value, event.currentTarget.selectionStart ?? value.length)
        }
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
    </div>
  )
}
