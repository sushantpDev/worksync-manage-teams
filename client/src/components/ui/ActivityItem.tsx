import {
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Upload,
  UserPlus,
} from 'lucide-react'
import type { Activity, RecentActivityItem } from '../../types'
import { formatRelativeTime } from '../../lib/utils'
import { Avatar } from './Avatar'
import { cn } from '../../lib/utils'

const activityIcons = {
  check: { Icon: CheckCircle2, className: 'text-green-500' },
  message: { Icon: MessageSquare, className: 'text-purple-500' },
  assign: { Icon: UserPlus, className: 'text-blue-500' },
  upload: { Icon: Upload, className: 'text-orange-500' },
  status: { Icon: RefreshCw, className: 'text-yellow-500' },
}

function resolveActor(activity: Activity) {
  return activity.actor ?? undefined
}

export function ActivityItem({ activity, className }: { activity: Activity; className?: string }) {
  const actor = resolveActor(activity)
  const text = activity.message ?? activity.description ?? ''
  const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : 'Someone'

  return (
    <div className={cn('flex gap-3 py-2.5', className)}>
      <Avatar
        userId={actor?.id ?? activity.actorId}
        name={actorName}
        src={actor?.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">
          <span className="font-medium">{actor?.firstName ?? 'Someone'}</span>
          <span className="text-text-secondary"> {text}</span>
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{formatRelativeTime(activity.createdAt)}</p>
      </div>
    </div>
  )
}

const activityTypeIcons: Record<string, RecentActivityItem['icon']> = {
  task_created: 'assign',
  task_assigned: 'assign',
  comment_added: 'message',
  attachment_added: 'upload',
  attachment_removed: 'upload',
  status_changed: 'status',
  project_updated: 'status',
  project_created: 'upload',
  member_added: 'assign',
  task_priority_changed: 'status',
}

export function RecentActivityFeedItem({
  item,
  className,
}: {
  item: RecentActivityItem
  className?: string
}) {
  const actor = item.actor
  const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : 'Someone'
  const { Icon, className: iconClass } = activityIcons[item.icon]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-surface/60',
        className
      )}
    >
      <Avatar
        userId={actor?.id ?? item.actorId}
        name={actorName}
        src={actor?.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-text-secondary">
          <span className="font-semibold text-text-primary">{actor?.firstName ?? 'Someone'}</span>{' '}
          {item.message}{' '}
          {item.highlight && (
            <span className="font-medium text-text-primary">{item.highlight}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-text-muted">{formatRelativeTime(item.createdAt)}</p>
      </div>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} strokeWidth={2} />
    </div>
  )
}

export function activityToFeedItem(activity: Activity): RecentActivityItem {
  return {
    id: activity.id,
    actorId: activity.actorId,
    actor: activity.actor,
    message: activity.message ?? '',
    highlight: activity.metadata?.taskTitle,
    createdAt: activity.createdAt,
    icon: activityTypeIcons[activity.type] ?? 'status',
  }
}
