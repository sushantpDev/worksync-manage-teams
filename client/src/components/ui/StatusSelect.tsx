import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { TaskStatus } from '../../types'
import { cn } from '../../lib/utils'

const STATUS_OPTIONS: {
  value: TaskStatus
  label: string
  dot: string
  chip: string
}[] = [
  {
    value: 'todo',
    label: 'Todo',
    dot: 'bg-slate-400',
    chip: 'bg-surface text-text-secondary border-border',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    dot: 'bg-blue-500',
    chip: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    value: 'in_review',
    label: 'In Review',
    dot: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  {
    value: 'done',
    label: 'Done',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
]

const MENU_MIN_WIDTH = 176
const MENU_GAP = 4

export function StatusSelect({
  value,
  onChange,
  disabled = false,
  size = 'sm',
  className,
}: {
  value: TaskStatus
  onChange: (value: TaskStatus) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const selected = STATUS_OPTIONS.find((opt) => opt.value === value) ?? STATUS_OPTIONS[0]

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const menuHeight = menuRef.current?.offsetHeight ?? STATUS_OPTIONS.length * 36 + 8
      const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP
      const openUpward = spaceBelow < menuHeight && rect.top > spaceBelow

      const width = Math.max(rect.width, MENU_MIN_WIDTH)
      let left = rect.left
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8)
      }

      setMenuStyle({
        position: 'fixed',
        left,
        width,
        top: openUpward ? undefined : rect.bottom + MENU_GAP,
        bottom: openUpward ? window.innerHeight - rect.top + MENU_GAP : undefined,
        zIndex: 80,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
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

  const menu = open && !disabled
    ? createPortal(
        <ul
          ref={menuRef}
          id={listId}
          role="listbox"
          aria-label="Status"
          style={menuStyle}
          className="overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
        >
          {STATUS_OPTIONS.map((opt) => {
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
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-surface font-semibold text-text-primary'
                      : 'font-medium text-text-primary/80 hover:bg-surface/80 hover:text-text-primary'
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', opt.dot)} />
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-text-primary" strokeWidth={2.5} />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>,
        document.body
      )
    : null

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label="Status"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors duration-150',
          size === 'sm' ? 'h-8 min-w-[8.25rem] px-2.5 text-xs' : 'h-11 w-full px-3 text-sm',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : open
              ? 'ring-2 ring-accent-purple/15'
              : 'hover:brightness-[0.98]',
          selected.chip
        )}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', selected.dot)} />
        <span className="min-w-0 flex-1 truncate text-left leading-none">{selected.label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-150',
            open && 'rotate-180'
          )}
          strokeWidth={2.25}
        />
      </button>
      {menu}
    </div>
  )
}
