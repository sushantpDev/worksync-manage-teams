import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-surface text-text-secondary',
  success: 'bg-accent-green-bg text-green-800',
  warning: 'bg-accent-yellow-bg text-yellow-800',
  danger: 'bg-accent-orange-bg text-red-700',
  info: 'bg-blue-50 text-blue-700',
  purple: 'bg-purple-50 text-purple-700',
  dark: 'bg-sidebar text-white',
  plain: 'bg-transparent px-0 text-text-secondary',
  'text-success': 'bg-transparent px-0 text-green-700',
  'text-info': 'bg-transparent px-0 text-blue-600',
  'text-info-strong': 'bg-transparent px-0 text-blue-700',
  'text-warning': 'bg-transparent px-0 text-amber-700',
  'text-muted': 'bg-transparent px-0 text-text-muted',
}

export function Badge({
  children,
  variant = 'default',
  className,
  dot,
}: {
  children: React.ReactNode
  variant?: keyof typeof variants
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: keyof typeof variants }> = {
    planning: { label: 'Planning', variant: 'text-info' },
    active: { label: 'Active', variant: 'text-success' },
    on_hold: { label: 'On Hold', variant: 'text-warning' },
    completed: { label: 'Completed', variant: 'text-success' },
    archived: { label: 'Archived', variant: 'text-muted' },
    todo: { label: 'Todo', variant: 'default' },
    in_progress: { label: 'In Progress', variant: 'info' },
    in_review: { label: 'In Review', variant: 'purple' },
    done: { label: 'Done', variant: 'success' },
    low: { label: 'Low', variant: 'default' },
    medium: { label: 'Medium', variant: 'text-info-strong' },
    high: { label: 'High', variant: 'warning' },
    urgent: { label: 'Urgent', variant: 'danger' },
  }

  const { label, variant } = config[status] ?? { label: status, variant: 'default' as const }

  return <Badge variant={variant}>{label}</Badge>
}
