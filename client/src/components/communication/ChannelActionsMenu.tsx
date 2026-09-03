import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function ChannelActionsMenu({
  isGeneral,
  onRename,
  onEditDetails,
  onDelete,
}: {
  isGeneral: boolean
  onRename: () => void
  onEditDetails: () => void
  onDelete: () => void
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
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Channel actions"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-700 group-hover/channel:opacity-100 data-[open=true]:opacity-100"
        data-open={open}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] rounded-lg border border-border bg-card py-1 shadow-lg"
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {!isGeneral && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              onClick={() => {
                setOpen(false)
                onRename()
              }}
            >
              Rename channel
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
            onClick={() => {
              setOpen(false)
              onEditDetails()
            }}
          >
            Edit channel details
          </button>
          {!isGeneral && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
            >
              Delete channel
            </button>
          )}
        </div>
      )}
    </div>
  )
}
