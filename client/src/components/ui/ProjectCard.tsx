import type { ReactNode } from 'react'
import { getProjectIconConfig } from '../../lib/projectIcons'
import type { Project, ProjectUserSummary } from '../../types'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { Avatar, AvatarGroup } from './Avatar'
import { StatusBadge } from './Badge'
import { ProjectIcon } from './KpiCard'
import { ProgressBar } from './ProgressBar'
import { cn } from '../../lib/utils'

function resolveOwner(project: Project): ProjectUserSummary | undefined {
  return project.owner ?? undefined
}

export function ProjectCard({
  project,
  onClick,
  className,
  actions,
}: {
  project: Project
  onClick?: () => void
  className?: string
  actions?: ReactNode
}) {
  const owner = resolveOwner(project)
  const iconConfig = getProjectIconConfig(project.id)

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[var(--radius-card)] border border-border-subtle bg-card p-5 shadow-[var(--shadow-card)]',
        'transition-all hover:shadow-[var(--shadow-card-hover)] cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ProjectIcon icon={iconConfig.icon} color={iconConfig.color} size="sm" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-text-primary">{project.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{project.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <StatusBadge status={project.status} />
          {actions}
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={project.progress} color="blue" showLabel />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {owner && (
            <Avatar
              userId={owner.id}
              name={`${owner.firstName} ${owner.lastName}`}
              src={owner.avatarUrl}
              size="sm"
            />
          )}
          <span className="text-xs text-text-secondary">
            {owner?.firstName} {owner?.lastName}
          </span>
        </div>
        <AvatarGroup
          userIds={project.memberIds}
          members={project.members}
          max={3}
          size="xs"
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-text-muted">
        <span>{project.taskCount} tasks</span>
        <span>Updated {formatRelativeTime(project.updatedAt)}</span>
      </div>
    </div>
  )
}

export function ProjectTableRow({
  project,
  onClick,
  actions,
}: {
  project: Project
  onClick?: () => void
  actions?: ReactNode
}) {
  const owner = resolveOwner(project)
  const iconConfig = getProjectIconConfig(project.id)

  return (
    <tr
      onClick={onClick}
      className="border-b border-border-subtle transition-colors hover:bg-surface/50 cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProjectIcon icon={iconConfig.icon} color={iconConfig.color} size="sm" />
          <div>
            <p className="text-sm font-medium text-text-primary">{project.name}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{project.description}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {owner && (
          <div className="flex items-center gap-2">
            <Avatar
              userId={owner.id}
              name={`${owner.firstName} ${owner.lastName}`}
              src={owner.avatarUrl}
              size="xs"
            />
            <span className="text-xs text-text-secondary">{owner.firstName}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <AvatarGroup userIds={project.memberIds} members={project.members} max={3} size="xs" />
      </td>
      <td className="px-4 py-3">
        <ProgressBar value={project.progress} color="blue" size="sm" showLabel />
      </td>
      <td className="px-4 py-3 align-middle">
        <StatusBadge status={project.status} />
      </td>
      <td className="px-4 py-3 text-xs text-text-secondary">
        {formatDate(project.startDate, { year: undefined })}
      </td>
      <td className="px-4 py-3 text-xs text-text-secondary">
        {formatDate(project.dueDate, { year: undefined })}
      </td>
      <td className="px-4 py-3 text-xs text-text-secondary tabular-nums">{project.taskCount}</td>
      <td className="px-4 py-3 text-xs text-text-muted">
        {formatRelativeTime(project.updatedAt)}
      </td>
      {actions != null && (
        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
          {actions}
        </td>
      )}
    </tr>
  )
}
