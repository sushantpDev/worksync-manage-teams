import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChange,
  className,
  showShortcut = false,
}: {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
  showShortcut?: boolean
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'h-11 w-full rounded-full border border-border bg-card pl-11 text-sm shadow-sm',
          showShortcut ? 'pr-16' : 'pr-4',
          'text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-sidebar/10 focus:border-border',
          'transition-shadow'
        )}
      />
      {showShortcut && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted sm:inline-flex">
          ⌘ K
        </kbd>
      )}
    </div>
  )
}
