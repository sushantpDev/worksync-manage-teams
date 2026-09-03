import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NotificationsProvider } from '../../context/NotificationsContext'
import { LoadingState } from '../ui/State'

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
])

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-surface">
        <LoadingState message="Loading your session..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (PUBLIC_PATHS.has(location.pathname) || location.pathname.startsWith('/invite/')) {
      return null
    }

    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return (
    <NotificationsProvider>
      <Outlet />
    </NotificationsProvider>
  )
}
