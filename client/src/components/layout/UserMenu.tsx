import {
  ChevronDown,
  ChevronRight,
  Globe,
  LogOut,
  Moon,
  Shield,
  User,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'
import { OrganizationSwitcher } from './OrganizationSwitcher'

const menuItems = [
  { label: 'Profile settings', icon: User, to: '/settings' },
  { label: 'Language and region', icon: Globe, hasChevron: true },
  { label: 'Appearance', icon: Moon, hasChevron: true },
  { label: 'Access control', icon: Shield, to: '/settings' },
]

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    member: 'Member',
    viewer: 'Viewer',
    client: 'Client',
  }
  return labels[role] ?? role
}

export function UserMenu() {
  const { user, organization, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  if (!user) {
    return null
  }

  const orgName = organization?.name ?? 'Organization'
  const orgShort = orgName.length > 14 ? `${orgName.slice(0, 12)}…` : orgName
  const subtitle = `${orgShort} | ${roleLabel(user.role ?? 'member')} (All groups)`

  async function handleLogout() {
    setOpen(false)
    navigate('/', { replace: true })
    await logout()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex max-w-[min(100vw-8rem,280px)] items-center gap-2.5 rounded-full bg-nav-chip py-1 pl-1.5 pr-3 transition-colors',
          open ? 'bg-nav-chip-hover ring-2 ring-accent-purple/15' : 'hover:bg-nav-chip-hover'
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <Avatar
            userId={user.id}
            name={`${user.firstName} ${user.lastName}`}
            src={user.avatarUrl}
            size="md"
            className="h-9 w-9 border-0"
          />
        </div>
        <div className="hidden min-w-0 flex-1 text-left sm:block">
          <p className="truncate text-sm font-semibold leading-tight text-text-primary">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-[11px] leading-tight text-text-secondary">{subtitle}</p>
        </div>
        <ChevronDown
          className={cn(
            'hidden h-4 w-4 shrink-0 text-text-secondary transition-transform sm:block',
            open && 'rotate-180'
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-24px,320px)] rounded-3xl border border-border/40 bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          role="menu"
        >
          <div className="mb-5">
            <p className="text-base font-semibold text-text-primary">
              {user.firstName} {user.lastName}
            </p>
            <p className="mt-0.5 text-sm text-text-secondary">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-card-muted px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {roleLabel(user.role ?? 'member')}
            </span>
          </div>

          <OrganizationSwitcher onClose={() => setOpen(false)} />

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const content = (
                <>
                  <item.icon className="h-[18px] w-[18px] shrink-0 text-text-primary" strokeWidth={1.75} />
                  <span className="flex-1 text-sm text-text-primary">{item.label}</span>
                  {item.hasChevron && (
                    <ChevronRight className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                  )}
                </>
              )

              if (item.to) {
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-card-muted"
                  >
                    {content}
                  </Link>
                )
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-card-muted"
                >
                  {content}
                </button>
              )
            })}

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-card-muted"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-text-primary" strokeWidth={1.75} />
              <span className="text-sm text-text-primary">Log out</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}
