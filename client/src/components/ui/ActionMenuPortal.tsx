import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

type MenuPosition = {
  top?: number
  bottom?: number
  right: number
}

export function ActionMenuPortal({
  open,
  onClose,
  trigger,
  children,
  menuClassName,
  estimatedMenuHeight = 120,
}: {
  open: boolean
  onClose: () => void
  trigger: (args: { ref: RefObject<HTMLButtonElement | null> }) => ReactNode
  children: ReactNode
  menuClassName?: string
  estimatedMenuHeight?: number
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  function updatePosition() {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < estimatedMenuHeight + 12

    setPosition({
      right: Math.max(8, window.innerWidth - rect.right),
      ...(openUp
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 4) }
        : { top: rect.bottom + 4 }),
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    updatePosition()
  }, [open, estimatedMenuHeight])

  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    function handleReposition() {
      updatePosition()
    }

    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, onClose])

  return (
    <>
      {trigger({ ref: buttonRef })}

      {open &&
        position &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[90] cursor-default"
              aria-label="Close menu"
              onClick={onClose}
            />
            <div
              role="menu"
              className={cn(
                'fixed z-[100] min-w-[10rem] rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]',
                menuClassName
              )}
              style={{
                top: position.top,
                bottom: position.bottom,
                right: position.right,
              }}
            >
              {children}
            </div>
          </>,
          document.body
        )}
    </>
  )
}
