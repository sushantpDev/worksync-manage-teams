import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const variants = {
  primary: 'bg-text-primary text-white hover:bg-gray-800 shadow-sm',
  secondary: 'bg-card-muted text-text-primary hover:bg-border-subtle border border-border',
  ghost: 'text-text-secondary hover:bg-card-muted hover:text-text-primary',
  outline: 'border border-border bg-card text-text-primary hover:bg-card-muted',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
}

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-10 px-5 text-sm rounded-lg',
  icon: 'h-9 w-9 rounded-lg p-0 flex items-center justify-center',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/20 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)

Button.displayName = 'Button'
