import { Smile } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

const EMOJI_GROUPS = [
  {
    label: 'Frequently used',
    emojis: ['👍', '❤️', '😂', '🎉', '✅', '👀', '🙏', '🔥', '💯', '👏'],
  },
  {
    label: 'Smileys',
    emojis: ['😀', '😊', '😅', '😉', '😍', '🤔', '😢', '😮', '😎', '🥳', '😴', '🤝', '🙃', '😇'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👋', '🤞', '✌️', '🤙', '💪', '🫡', '🤝', '👏', '🙌'],
  },
  {
    label: 'Objects',
    emojis: ['💡', '📎', '📌', '✏️', '📝', '💻', '📱', '⏰', '🎯', '🚀'],
  },
]

export function ComposerEmojiPicker({
  disabled,
  onSelect,
}: {
  disabled?: boolean
  onSelect: (emoji: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleSelect(emoji: string) {
    onSelect(emoji)
    setOpen(false)
    setQuery('')
  }

  const normalizedQuery = query.trim()
  const filteredGroups = normalizedQuery
    ? EMOJI_GROUPS.map((group) => ({
        ...group,
        emojis: group.emojis.filter((emoji) => emoji.includes(normalizedQuery)),
      })).filter((group) => group.emojis.length > 0)
    : EMOJI_GROUPS

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label="Insert emoji"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors',
          'hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50',
          open && 'bg-gray-100 text-[#6264a7]'
        )}
      >
        <Smile className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-[min(100vw-2rem,280px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emoji"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6264a7]/40 focus:outline-none focus:ring-2 focus:ring-[#6264a7]/10"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-2">
            {filteredGroups.length === 0 ? (
              <p className="px-2 py-3 text-sm text-gray-500">No emoji found</p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.label} className="mb-2 last:mb-0">
                  <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {group.emojis.map((emoji) => (
                      <button
                        key={`${group.label}-${emoji}`}
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-gray-100"
                        onClick={() => handleSelect(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
