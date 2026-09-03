import { Hash, X } from 'lucide-react'
import { useEffect } from 'react'
import type { OrganizationMember, Team } from '../../types'
import { TeamMembersPanel } from '../team/TeamMembersPanel'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

function parseFocusTags(description?: string) {
  if (!description?.trim()) return []
  return description
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function TeamDetailsDrawer({
  open,
  onClose,
  organizationId,
  team,
  channelSlug,
  channelDescription,
  orgMembers,
  canManage,
  membersRefreshKey,
  onTeamUpdated,
}: {
  open: boolean
  onClose: () => void
  organizationId: string
  team: Team
  channelSlug: string
  channelDescription?: string
  orgMembers: OrganizationMember[]
  canManage: boolean
  membersRefreshKey: number
  onTeamUpdated?: (team: Team) => void
}) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const focusTags = parseFocusTags(team.description)

  return (
    <>
      <button
        type="button"
        aria-label="Close team details"
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-border bg-card shadow-xl',
          'lg:relative lg:z-auto lg:shrink-0 lg:shadow-none',
          'w-full sm:max-w-md lg:w-[min(100%,420px)] lg:min-w-[360px]'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-text-primary">{team.name}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-purple/10">
                <Hash className="h-3.5 w-3.5 text-accent-purple" />
              </div>
              <span className="truncate font-medium"># {channelSlug}</span>
            </div>
            {channelDescription && (
              <p className="mt-2 text-sm text-text-muted">{channelDescription}</p>
            )}
            {focusTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {focusTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border-subtle bg-surface px-2 py-0.5 text-xs text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close team details"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <TeamMembersPanel
            organizationId={organizationId}
            team={team}
            orgMembers={orgMembers}
            canManage={canManage}
            enabled={open}
            refreshKey={membersRefreshKey}
            onTeamUpdated={onTeamUpdated}
          />
        </div>
      </aside>
    </>
  )
}
