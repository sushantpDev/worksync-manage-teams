import {
  Bell,
  Eye,
  HelpCircle,
  Settings,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationsContext'
import { cn } from '../../lib/utils'
import { GlobalSearch } from './GlobalSearch'
import { MobileNavToggle } from './Sidebar'
import { UserMenu } from './UserMenu'

function NavIconButton({
  label,
  children,
  badge,
  className,
  to,
  onClick,
}: {
  label: string
  children: ReactNode
  badge?: number
  className?: string
  to?: string
  onClick?: () => void
}) {
  const classes = cn(
    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
    'bg-nav-chip text-text-primary transition-colors hover:bg-nav-chip-hover',
    className
  )

  const content = (
    <>
      {children}
      {badge != null && badge > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} aria-label={label} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={classes}>
      {content}
    </button>
  )
}

export function TopBar({
  onMobileNavToggle,
  mobileNavOpen,
}: {
  onMobileNavToggle?: () => void
  mobileNavOpen?: boolean
}) {
  const { unreadCount } = useNotifications()

  return (
    <header className="flex shrink-0 items-center gap-2 bg-surface px-4 py-3 sm:gap-3 sm:px-5 sm:py-3">
      <div className="flex shrink-0 items-center gap-3">
        {onMobileNavToggle && (
          <MobileNavToggle open={mobileNavOpen ?? false} onToggle={onMobileNavToggle} />
        )}
        <span className="text-[1.35rem] font-bold tracking-tight text-text-primary">
          WorkSync<span className="text-text-primary">.</span>
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 basis-0 justify-center overflow-visible px-2 md:flex lg:px-4">
        <GlobalSearch className="w-full max-w-[36rem] lg:max-w-[40rem]" />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <div className="hidden items-center gap-2 sm:flex">
          <NavIconButton label="AI assistant">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </NavIconButton>
          <NavIconButton label="Settings" to="/settings">
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </NavIconButton>
          <NavIconButton label="Help" to="/help">
            <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </NavIconButton>
          <NavIconButton label="View mode">
            <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </NavIconButton>
        </div>

        <NavIconButton label="Notifications" badge={unreadCount} to="/notifications">
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </NavIconButton>

        <UserMenu />
      </div>
    </header>
  )
}
