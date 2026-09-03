import { ChevronDown, Globe } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export const AUTH_BG_LIGHT = '#b8a5fe'
export const AUTH_BG_DARK = '#9f82ea'
export const AUTH_LINK_COLOR = '#1871bd'

export function AuthMarketingPanel() {
  return null
}

function AuthBackgroundStage() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-0 overflow-hidden"
      style={{
        width: 'max(100vw, calc(100vh * 2.133333))',
        height: 'max(100vh, calc(100vw * 0.46875))',
        transform: 'translate(-50%, -50%)',
      }}
      aria-hidden
    >
      <img
        src="/images/auth/auth-bg-centered.png"
        alt=""
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />
      <p className="absolute left-0 top-[84%] w-[56%] -translate-y-1/2 text-center text-[clamp(18px,1.45vw,25px)] font-normal text-[#161616]">
        Made for remote teams everywhere.
      </p>
    </div>
  )
}

export function AuthPageHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-7 sm:px-10 lg:px-12">
      <Link
        to="/"
        className="text-[1.35rem] font-bold lowercase leading-none text-[#17171c] sm:text-[1.45rem]"
      >
        worksync<span className="text-black">.</span>
      </Link>

      <button
        type="button"
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#1f1f1f] bg-transparent px-2.5 text-[15px] font-medium text-[#1d1d1d] transition-colors hover:bg-white/20"
        aria-label="Language"
      >
        <Globe className="h-[18px] w-[18px]" strokeWidth={2.5} />
        En
        <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </header>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[460px] rounded-lg bg-white px-8 py-6 shadow-[0_18px_70px_rgba(72,47,130,0.16)]">
      {children}
    </div>
  )
}

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden bg-[#b8a5fe] font-sans">
      <AuthBackgroundStage />
      <AuthPageHeader />

      <div className="relative z-10 grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-[56%_44%]">
        <div className="flex items-start justify-center px-6 pb-12 pt-24 sm:px-10 lg:px-12 lg:pb-16 lg:pt-12">
          <AuthMarketingPanel />
        </div>

        <div className="flex items-center justify-center px-6 pb-14 pt-2 sm:px-10 lg:px-12 lg:pb-8 lg:pt-12">
          {children}
        </div>
      </div>
    </div>
  )
}

export function AuthCardTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-center text-[2rem] font-bold leading-tight text-[#1f1f1f]">
      {children}
    </h1>
  )
}

export function AuthPrimaryButton({
  children,
  disabled,
  type = 'submit',
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'submit' | 'button'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="h-[44px] w-full rounded-[10px] bg-[#1a1a1a] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function AuthSecondaryButton({
  children,
  onClick,
  to,
  linkState,
}: {
  children: ReactNode
  onClick?: () => void
  to?: string
  linkState?: unknown
}) {
  const className =
    'flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#1f1f1f] bg-white text-[15px] font-semibold text-[#1f1f1f] transition-colors hover:bg-black/[0.03]'

  if (to) {
    return (
      <Link to={to} state={linkState} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  )
}

export function AuthCardFooter({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-center text-[15px] text-[#282828]">{children}</p>
  )
}
