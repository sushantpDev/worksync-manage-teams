import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { ActionMenuPortal } from '../ui/ActionMenuPortal'

export function MemberRowActions({
  onChangeRole,
  onRemove,
}: {
  onChangeRole: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <ActionMenuPortal
      open={open}
      onClose={() => setOpen(false)}
      estimatedMenuHeight={100}
      trigger={({ ref }) => (
        <Button
          ref={ref}
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Member actions"
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
      <button
        type="button"
        role="menuitem"
        className="flex w-full px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#f9fafb]"
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
    </ActionMenuPortal>
  )
}
