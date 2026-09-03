import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

export function FormSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  placeholder,
  className,
}: {
  label?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((opt) => opt.value === value)
  const displayLabel = selected?.label ?? placeholder ?? 'Select...'

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

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <div className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-text-primary">{label}</span>
      )}

      <div ref={containerRef} className="relative w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-label={label}
          aria-required={required}
          className={cn(
            'flex h-11 w-full items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium leading-5 shadow-sm transition-colors duration-150',
            disabled
              ? 'cursor-not-allowed border-border text-text-muted opacity-60'
              : open
                ? 'border-text-primary/25 bg-card-muted'
                : 'border-border text-text-primary hover:border-text-primary/15 hover:bg-card-muted',
            !value && 'text-text-muted'
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left leading-5">{displayLabel}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-text-muted transition-transform duration-150',
              open && 'rotate-180'
            )}
            strokeWidth={2}
          />
        </button>

        {open && !disabled && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label ?? 'Options'}
            className="absolute left-0 top-[calc(100%+4px)] z-[60] max-h-56 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
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
                      'grid w-full grid-cols-[minmax(0,1fr)_16px] items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm leading-5 transition-colors',
                      isSelected
                        ? 'bg-surface font-semibold text-text-primary'
                        : 'font-medium text-text-primary/80 hover:bg-surface/80 hover:text-text-primary'
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
    </div>
  )
}
