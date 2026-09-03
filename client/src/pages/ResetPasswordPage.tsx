import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { AuthField } from '../components/auth/AuthField'
import {
  AUTH_LINK_COLOR,
  AuthCard,
  AuthCardFooter,
  AuthCardTitle,
  AuthPageShell,
  AuthPrimaryButton,
} from '../components/auth/AuthLayout'
import { ApiError, authApi } from '../lib/api'
import { isValidPassword } from '../lib/validation'

function InvalidTokenCard() {
  return (
    <AuthCard>
      <AuthCardTitle>Reset password</AuthCardTitle>
      <p className="mt-3 text-left text-[14px] leading-relaxed text-[#6b7280]">
        This password reset link is invalid or has expired.
      </p>
      <Link
        to="/forgot-password"
        className="mt-8 flex h-[52px] w-full items-center justify-center rounded-[10px] bg-black text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Request a new reset link
      </Link>
      <AuthCardFooter>
        <Link
          to="/login"
          className="font-semibold hover:underline"
          style={{ color: AUTH_LINK_COLOR }}
        >
          Back to Sign In
        </Link>
      </AuthCardFooter>
    </AuthCard>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  if (!token) {
    return (
      <AuthPageShell>
        <InvalidTokenCard />
      </AuthPageShell>
    )
  }

  return <ResetPasswordForm token={token} navigate={navigate} />
}

function ResetPasswordForm({
  token,
  navigate,
}: {
  token: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)

  if (tokenExpired) {
    return (
      <AuthPageShell>
        <InvalidTokenCard />
      </AuthPageShell>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!newPassword || !confirmPassword) {
      setError('New password and confirmation are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!isValidPassword(newPassword)) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)

    try {
      await authApi.resetPassword(token, newPassword)
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successfully.' },
      })
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to reset password'
      if (message === 'Reset link is invalid or has expired.') {
        setTokenExpired(true)
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardTitle>Reset password</AuthCardTitle>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3.5">
          {error && (
            <div className="rounded-[10px] bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <AuthField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <AuthField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div className="pt-3">
            <AuthPrimaryButton disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </AuthPrimaryButton>
          </div>
        </form>

        <AuthCardFooter>
          <Link
            to="/login"
            className="font-semibold hover:underline"
            style={{ color: AUTH_LINK_COLOR }}
          >
            Back to Sign In
          </Link>
        </AuthCardFooter>
      </AuthCard>
    </AuthPageShell>
  )
}
