import { Avatar } from '../ui/Avatar'
import type { MentionCandidate } from '../../lib/mentionUtils'
import { mentionDisplayName } from '../../lib/mentionUtils'

export function MentionAutocomplete({
  candidates,
  activeIndex,
  onSelect,
  onHover,
}: {
  candidates: MentionCandidate[]
  activeIndex: number
  onSelect: (candidate: MentionCandidate) => void
  onHover: (index: number) => void
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
      <div className="border-b border-border-subtle px-3 py-2 text-xs font-medium text-text-muted">
        Mention someone
      </div>
      {candidates.length === 0 ? (
        <p className="px-3 py-3 text-sm text-text-muted">No matching members</p>
      ) : (
        <ul className="py-1">
          {candidates.map((candidate, index) => {
            const name = mentionDisplayName(candidate)
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface ${
                    index === activeIndex ? 'bg-accent-purple/10' : ''
                  }`}
                  onMouseEnter={() => onHover(index)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSelect(candidate)
                  }}
                >
                  <Avatar userId={candidate.id} name={name} src={candidate.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{name}</p>
                    {candidate.email && (
                      <p className="truncate text-xs text-text-muted">{candidate.email}</p>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
