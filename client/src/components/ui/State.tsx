import { Button } from './Button'
import { cn } from '../../lib/utils'

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border bg-card px-6 py-12 text-center',
        className
      )}
    >
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-text-primary" />
        {message}
      </div>
    </div>
  )
}
