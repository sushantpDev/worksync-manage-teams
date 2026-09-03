import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'

export function ProjectActionsMenu({
  onEdit,
  onArchive,
  onDelete,
  showEdit = false,
  showArchive = false,
  showDelete = false,
  align = 'right',
}: {
  onEdit?: () => void
  onArchive?: () => void
  onDelete?: () => void
  showEdit?: boolean
  showArchive?: boolean
  showDelete?: boolean
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasActions = showEdit || showArchive || showDelete

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

  if (!hasActions) {
    return null
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Project actions"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className={`absolute top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-border bg-card py-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {showEdit && onEdit && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-card-muted"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
            >
              Edit
            </button>
          )}
          {showArchive && onArchive && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-card-muted"
              onClick={() => {
                setOpen(false)
                onArchive()
              }}
            >
              Archive project
            </button>
          )}
          {showDelete && onDelete && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
            >
              Delete project
            </button>
          )}
        </div>
      )}
    </div>
  )
}
