import { cn } from '../../lib/utils'

export function Card({
  className,
  children,
  padding = 'default',
}: {
  className?: string
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'default' | 'lg'
}) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-5',
    lg: 'p-6',
  }

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-border-subtle bg-card shadow-[var(--shadow-card)]',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
