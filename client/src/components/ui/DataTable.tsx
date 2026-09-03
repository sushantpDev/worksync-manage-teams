import { cn } from '../../lib/utils'

export function DataTable({
  children,
  className,
  tableClassName,
}: {
  children: React.ReactNode
  className?: string
  tableClassName?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-card', className)}>
      <div className="overflow-x-auto">
        <table className={cn('w-full min-w-[900px] text-left', tableClassName)}>{children}</table>
      </div>
    </div>
  )
}

export function DataTableHead({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <thead>
      <tr
        className={cn(
          'border-b border-border-subtle bg-white text-[11px] font-semibold uppercase tracking-wide text-text-muted',
          className
        )}
      >
        {children}
      </tr>
    </thead>
  )
}

export function DataTableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <th className={cn('px-4 py-3', className)}>{children}</th>
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}
