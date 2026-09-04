import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { ActionMenuPortal } from '../ui/ActionMenuPortal'

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
          aria-label="Team member actions"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}
    >
      {!isLead && onMakeLead && (
        <button
          type="button"
          role="menuitem"
          className="flex w-full px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#f9fafb]"
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
          className="flex w-full px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#f9fafb]"
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
    </ActionMenuPortal>
  )
}
