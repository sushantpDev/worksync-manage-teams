import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'

export function TeamMemberRowActions({
  isLead,
  onMakeLead,
  onRemoveLead,
  onRemoveFromTeam,
}: {
  isLead: boolean
  onMakeLead?: () => void
  onRemoveLead?: () => void
  onRemoveFromTeam: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Team member actions"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-border bg-card py-1 shadow-lg"
          role="menu"
        >
          {!isLead && onMakeLead && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-card-muted"
              onClick={() => {
                setOpen(false)
                onMakeLead()
              }}
            >
              Make team lead
            </button>
          )}
          {isLead && onRemoveLead && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-card-muted"
              onClick={() => {
                setOpen(false)
                onRemoveLead()
              }}
            >
              Remove as team lead
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false)
              onRemoveFromTeam()
            }}
          >
            Remove from team
          </button>
        </div>
      )}
    </div>
  )
}
