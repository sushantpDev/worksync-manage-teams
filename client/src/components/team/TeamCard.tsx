import { Crown, Users } from 'lucide-react'
import type { Team } from '../../types'
import { getProjectIconConfig } from '../../lib/projectIcons'
import { cn } from '../../lib/utils'

function memberLabel(count: number) {
  return count === 1 ? '1 member' : `${count} members`
}

function getLeadName(team: Team) {
  const lead = team.lead ?? team.members?.find((member) => member.id === team.leadId)
  if (!lead) return null
  return `${lead.firstName} ${lead.lastName}`
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'TM'
}

function TeamAvatarStack({ team }: { team: Team }) {
  const members = team.members ?? []
  const visibleMembers = members.slice(0, 4)
  const remainingCount = Math.max(team.memberIds.length - visibleMembers.length, 0)

  if (visibleMembers.length === 0) {
    return (
      <div className="flex -space-x-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#f3f4f6] text-[11px] font-semibold text-[#6b7280]">
          TM
        </span>
      </div>
    )
  }

  return (
    <div className="flex -space-x-2">
      {visibleMembers.map((member) =>
        member.avatarUrl ? (
          <img
            key={member.id}
            src={member.avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full border-2 border-white bg-[#f3f4f6] object-cover"
            draggable={false}
          />
        ) : (
          <span
            key={member.id}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#eef2ff] text-[11px] font-semibold text-[#4f46e5]"
          >
            {getInitials(member.firstName, member.lastName)}
          </span>
        )
      )}
      {remainingCount > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#111827] text-[10px] font-semibold text-white">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}

export function TeamCard({
  team,
  index = 0,
  onClick,
  onManageMembers,
  interactive = false,
  canManageMembers = false,
  className,
}: {
  team: Team
  index?: number
  onClick?: () => void
  onManageMembers?: () => void
  interactive?: boolean
  canManageMembers?: boolean
  className?: string
}) {
  const iconConfig = getProjectIconConfig(team.id)
  const Icon = iconConfig.icon
  const description =
    team.description?.trim() ||
    'Add a short description to help your organization understand this team.'
  const leadName = getLeadName(team)
  const hasMembers = team.memberIds.length > 0

  const Wrapper = interactive && onClick ? 'button' : 'article'

  return (
    <Wrapper
      type={interactive && onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex min-h-[236px] w-full flex-col overflow-hidden rounded-2xl border border-[#e6e9ef] bg-white p-5 text-left',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)] transition-all duration-200',
        interactive &&
          onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-[#d3d8e2] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_18px_42px_rgba(15,23,42,0.09)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#cdbff3] bg-[#ddd0ff] text-[#23212b]">
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
              Team {String(index + 1).padStart(2, '0')}
            </p>
            <p className="mt-1 truncate text-[13px] font-medium text-[#667085]">
              {leadName ? `Led by ${leadName}` : hasMembers ? 'Active workspace' : 'Setup pending'}
            </p>
          </div>
        </div>

        {leadName ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f8fafc] text-[#667085]">
            <Crown className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="text-[20px] font-semibold leading-[1.25] text-[#101828]">
          {team.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-[#667085]">
          {description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eef1f5] pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <TeamAvatarStack team={team} />
          <span className="truncate text-[13px] font-semibold text-[#344054]">
            {memberLabel(team.memberIds.length)}
          </span>
        </div>

        {canManageMembers && onManageMembers ? (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#d7dce3] bg-white px-3 py-2 text-[12px] font-semibold text-[#111827] transition-colors hover:bg-[#f8fafc]"
            onClick={(e) => {
              e.stopPropagation()
              onManageMembers()
            }}
          >
            <Users className="h-3.5 w-3.5" strokeWidth={2.1} />
            Manage
          </button>
        ) : null}
      </div>
    </Wrapper>
  )
}
