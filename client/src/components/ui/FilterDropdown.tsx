import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

const triggerClass =
  'inline-flex h-10 w-full min-w-[9.5rem] items-center gap-2 rounded-full border bg-card px-4 text-xs font-medium leading-none text-text-primary shadow-sm transition-colors duration-150'

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((opt) => opt.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative inline-flex w-fit flex-col', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={label}
        className={cn(
          triggerClass,
          open
            ? 'border-text-primary/25 bg-card-muted'
            : 'border-border hover:border-text-primary/15 hover:bg-card-muted'
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label ?? label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-text-muted transition-transform duration-150',
            open && 'rotate-180'
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-full overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'grid w-full grid-cols-[minmax(0,1fr)_16px] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs leading-none transition-colors',
                    isSelected
                      ? 'bg-surface font-semibold text-text-primary'
                      : 'font-medium text-text-primary/75 hover:bg-surface/80 hover:text-text-primary'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="flex items-center justify-center">
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-text-primary" strokeWidth={2.5} />
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ViewModeToggle({
  value,
  onChange,
  options,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center rounded-full border border-border bg-card p-1 shadow-sm',
        className
      )}
      role="group"
      aria-label="View mode"
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'flex h-8 items-center rounded-full px-4 text-xs font-medium leading-none transition-colors duration-150',
              active
                ? 'bg-text-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function DatePicker({
  label,
  value,
  onChange,
  className,
}: {
  label?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={label ?? 'Select date'}
      className={cn(
        'h-10 rounded-full border border-border bg-card px-4 text-xs font-medium text-text-primary shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-accent-purple/20 cursor-pointer',
        className
      )}
    />
  )
}
