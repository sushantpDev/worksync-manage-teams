import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { inviteStorage } from '../../lib/inviteStorage'
import { LoadingState } from '../ui/State'

function resolvePostAuthRedirect(location: ReturnType<typeof useLocation>) {
  const state = (location.state as { from?: string } | null) ?? {}
  if (state.from?.startsWith('/invite/')) {
    return state.from
  }
  return inviteStorage.getReturnPath() ?? '/dashboard'
}

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-surface">
        <LoadingState message="Loading..." />
      </div>
    )
  }

  if (isAuthenticated) {
    const redirectTo = resolvePostAuthRedirect(location)
    if (redirectTo.startsWith('/invite/')) {
      inviteStorage.clear()
    }
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
