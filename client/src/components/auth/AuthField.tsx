import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function AuthField({
  label,
  className,
  inputClassName,
  type = 'text',
  placeholder: _placeholder,
  ...props
}: {
  label: string
  className?: string
  inputClassName?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <div
      className={cn(
        'relative min-h-[56px] rounded-[14px] border border-[#c7c7c7] bg-[#f1f1f1] px-4 transition-shadow focus-within:border-[#8b8b8b] focus-within:ring-2 focus-within:ring-black/[0.04]',
        className
      )}
    >
      <div className="relative flex min-h-[56px] items-center">
        <input
          type={isPassword && visible ? 'text' : type}
          placeholder=" "
          className={cn(
            'auth-floating-input peer h-[56px] w-full bg-transparent pt-4 text-[14px] font-normal leading-tight text-black outline-none',
            isPassword && 'pr-9',
            inputClassName
          )}
          {...props}
        />
        <label className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[15px] font-normal leading-none text-[#6f6f6f] transition-all duration-150 peer-focus:top-3 peer-focus:text-[12px] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[12px]">
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 text-black hover:opacity-70"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? (
              <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.75} />
            ) : (
              <Eye className="h-[17px] w-[17px]" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
