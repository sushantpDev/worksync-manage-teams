import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { ActionMenuPortal } from '../ui/ActionMenuPortal'

export function ProjectActionsMenu({
  onEdit,
  onArchive,
  onDelete,
  showEdit = false,
  showArchive = false,
  showDelete = false,
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

  const hasActions = showEdit || showArchive || showDelete
  if (!hasActions) return null

  return (
    <ActionMenuPortal
      open={open}
      onClose={() => setOpen(false)}
      estimatedMenuHeight={140}
      trigger={({ ref }) => (
        <Button
          ref={ref}
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Project actions"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation()
            setOpen((value) => !value)
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}
    >
      {showEdit && onEdit && (
        <button
          type="button"
          role="menuitem"
          className="flex w-full px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#f9fafb]"
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
          className="flex w-full px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#f9fafb]"
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
    </ActionMenuPortal>
  )
}
