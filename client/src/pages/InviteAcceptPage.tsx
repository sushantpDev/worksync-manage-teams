import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, invitationsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { orgStorage } from '../lib/orgStorage'
import { tokenStorage } from '../lib/tokenStorage'
import { inviteStorage } from '../lib/inviteStorage'
import type { InvitationPreview } from '../types'
import { Button } from '../components/ui/Button'
import { LoadingState } from '../components/ui/State'

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user, refreshSession } = useAuth()

  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const invitePath = token ? `/invite/${token}` : '/dashboard'

  const loadInvitation = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      const data = await invitationsApi.getByToken(token)
      setInvitation(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invitation not found')
      setInvitation(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      inviteStorage.setReturnPath(`/invite/${token}`)
    }
  }, [token])

  useEffect(() => {
    loadInvitation()
  }, [loadInvitation])

  async function handleAccept() {
    if (!token) return
    setAccepting(true)
    setError(null)

    try {
      const result = await invitationsApi.accept(token)
      tokenStorage.setTokens(result.accessToken, result.refreshToken)
      if (result.organization?.id) {
        orgStorage.setOrganizationId(result.organization.id)
      }
      await refreshSession()
      inviteStorage.clear()
      navigate('/team', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState message="Loading invitation..." />
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-text-primary">Invitation unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {error ?? 'This invitation may have expired or been revoked.'}
          </p>
          <Button className="mt-6" onClick={() => navigate('/login')}>Go to sign in</Button>
        </div>
      </div>
    )
  }

  const orgName = invitation.organization?.name ?? 'an organization'
  const inviterName = invitation.inviter
    ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
    : 'A team admin'
  const expiresLabel = new Date(invitation.expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const emailMismatch =
    isAuthenticated &&
    user?.email.toLowerCase() !== invitation.email.toLowerCase()

  const canAccept =
    isAuthenticated &&
    !emailMismatch &&
    invitation.status === 'pending' &&
    new Date(invitation.expiresAt) > new Date()

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <p className="text-[1.35rem] font-bold tracking-tight text-text-primary">
            WorkSync<span className="text-text-primary">.</span>
          </p>
          <h1 className="mt-4 text-xl font-semibold text-text-primary">
            Join {orgName}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {inviterName} invited <strong>{invitation.email}</strong> as a{' '}
            <span className="capitalize">{invitation.role}</span>.
          </p>
          <p className="mt-1 text-xs text-text-muted">Expires {expiresLabel}</p>
        </div>

        {invitation.status !== 'pending' && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This invitation is {invitation.status}.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {emailMismatch && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            You are signed in as {user?.email}. Sign in with {invitation.email} to accept this invitation.
          </div>
        )}

        <div className="mt-8 space-y-3">
          {!isAuthenticated ? (
            <>
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  inviteStorage.setReturnPath(invitePath)
                  navigate('/login', { state: { from: invitePath, inviteEmail: invitation.email } })
                }}
              >
                Sign in to accept
              </Button>
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => {
                  inviteStorage.setReturnPath(invitePath)
                  navigate('/register', {
                    state: { from: invitePath, inviteEmail: invitation.email },
                  })
                }}
              >
                Create account
              </Button>
            </>
          ) : canAccept ? (
            <Button className="w-full" size="lg" onClick={handleAccept} disabled={accepting}>
              {accepting ? 'Accepting...' : 'Accept invitation'}
            </Button>
          ) : !emailMismatch && invitation.status === 'pending' ? (
            <p className="text-center text-sm text-text-secondary">
              This invitation has expired. Ask your admin to send a new one.
            </p>
          ) : null}

          {isAuthenticated && (
            <p className="text-center text-sm text-text-secondary">
              <Link to="/dashboard" className="font-medium text-text-primary hover:underline">
                Back to dashboard
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
