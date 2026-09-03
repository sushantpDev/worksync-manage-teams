import { cn } from '../../lib/utils'

const barColors = {
  orange: 'bg-orange-400',
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
  green: 'bg-green-500',
  pink: 'bg-pink-400',
  yellow: 'bg-yellow-400',
  default: 'bg-sidebar',
  slate: 'bg-slate-500',
}

export function ProgressBar({
  value,
  max = 100,
  color = 'default',
  size = 'md',
  showLabel,
  className,
}: {
  value: number
  max?: number
  color?: keyof typeof barColors
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}) {
  const percentage = Math.min(100, Math.round((value / max) * 100))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex-1 overflow-hidden rounded-full bg-surface',
          size === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium tabular-nums text-text-secondary">{percentage}%</span>
      )}
    </div>
  )
}
