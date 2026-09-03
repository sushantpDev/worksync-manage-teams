import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'

export function MemberRowActions({
  onChangeRole,
  onRemove,
}: {
  onChangeRole: () => void
  onRemove: () => void
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
        aria-label="Member actions"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-border bg-card py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-card-muted"
            onClick={() => {
              setOpen(false)
              onChangeRole()
            }}
          >
            Change role
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false)
              onRemove()
            }}
          >
            Remove from organization
          </button>
        </div>
      )}
    </div>
  )
}
