import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Clock, FolderCheck, ListTodo, Minus, Plus, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'

type KpiVariant = 'yellow' | 'green' | 'orange' | 'blue'

const iconStyles: Record<
  KpiVariant,
  { bg: string; text: string; ring: string; Icon: LucideIcon }
> = {
  yellow: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-100',
    Icon: TrendingUp,
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-100',
    Icon: FolderCheck,
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-100',
    Icon: Clock,
  },
  blue: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-100',
    Icon: ListTodo,
  },
}

function TrendBadge({ label }: { label: string }) {
  const normalized = label.trim().toLowerCase()
  const isUp = normalized.includes('+') || normalized.includes('up') || normalized.includes('on track')
  const isDown = normalized.includes('-') || normalized.includes('down') || normalized.includes('overdue')
  const isNeutral =
    !isUp &&
    !isDown &&
    (normalized === '0%' ||
      normalized.includes('no ') ||
      normalized.includes('unchanged') ||
      normalized.includes('0 /'))

  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        isUp && 'bg-emerald-50 text-emerald-700',
        isDown && 'bg-red-50 text-red-700',
        isNeutral && 'bg-zinc-100 text-zinc-600',
        !isUp && !isDown && !isNeutral && 'bg-zinc-100 text-zinc-600'
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {label}
    </span>
  )
}

export function KpiCard({
  label,
  value,
  trendLabel,
  variant,
  className,
}: {
  label: string
  value: string
  trendLabel: string
  sparkline?: number[]
  variant: KpiVariant
  className?: string
}) {
  const { bg, text, ring, Icon } = iconStyles[variant]

  return (
    <div
      className={cn(
        'group relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_12px_28px_rgba(15,23,42,0.07)]',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-80',
          bg
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          {label}
        </p>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4',
            bg,
            text,
            ring
          )}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
      </div>

      <div className="relative mt-4">
        <p className="text-[2rem] font-semibold leading-none tracking-tight text-text-primary tabular-nums">
          {value}
        </p>
        <div className="mt-3">
          <TrendBadge label={trendLabel} />
        </div>
      </div>
    </div>
  )
}

export function AddProjectCard({
  onClick,
  className,
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/90 bg-card/70 p-5',
        'shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200',
        'hover:border-accent-purple/35 hover:bg-accent-purple-light/20 hover:shadow-[0_8px_24px_rgba(139,92,246,0.08)]',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple-light text-accent-purple ring-4 ring-white transition-transform duration-200 group-hover:scale-105">
        <Plus className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <p className="mt-3 text-sm font-semibold text-text-primary">Add New Project</p>
      <p className="mt-0.5 text-xs text-text-muted">Create and assign a team</p>
    </button>
  )
}

export function ProjectIcon({
  icon: Icon,
  color,
  size = 'md',
}: {
  icon: LucideIcon
  color: 'orange' | 'blue' | 'purple' | 'green' | 'pink' | 'slate'
  size?: 'sm' | 'md'
}) {
  const colors = {
    orange: 'bg-orange-100 text-orange-700 ring-orange-50',
    blue: 'bg-sky-100 text-sky-700 ring-sky-50',
    purple: 'bg-slate-100 text-slate-700 ring-slate-50',
    green: 'bg-emerald-100 text-emerald-700 ring-emerald-50',
    pink: 'bg-rose-100 text-rose-700 ring-rose-50',
    slate: 'bg-slate-100 text-slate-700 ring-slate-50',
  }

  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-[18px] w-[18px]',
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full ring-4',
        sizes[size],
        colors[color]
      )}
    >
      <Icon className={iconSizes[size]} strokeWidth={2} />
    </div>
  )
}
