import { useAuth } from '../../context/AuthContext'
import { MobileNavToggle } from './Sidebar'

export function PageHeader({
  title,
  subtitle,
  actions,
  onMobileNavToggle,
  mobileNavOpen,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onMobileNavToggle?: () => void
  mobileNavOpen?: boolean
}) {
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {onMobileNavToggle && (
            <MobileNavToggle open={mobileNavOpen ?? false} onToggle={onMobileNavToggle} />
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  )
}

export function PageGreeting({
  subtitle,
}: {
  subtitle?: string
}) {
  const { user } = useAuth()

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-[1.65rem]">
        Welcome, {user?.firstName ?? 'there'}! 👋
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      )}
    </div>
  )
}
