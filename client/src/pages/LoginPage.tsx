import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { AuthField } from '../components/auth/AuthField'
import {
  AUTH_LINK_COLOR,
  AuthCard,
  AuthCardFooter,
  AuthCardTitle,
  AuthPageShell,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as { from?: string; inviteEmail?: string; message?: string } | null) ?? {}
  const from = state.from ?? '/dashboard'
  const successMessage = state.message

  const [email, setEmail] = useState(state.inviteEmail ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardTitle>Welcome back</AuthCardTitle>

        <form onSubmit={handleSubmit} className="mt-9 space-y-4">
          {successMessage && (
            <div className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <AuthField
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-2.5">
              <Link
                to="/forgot-password"
                className="text-[15px] font-normal hover:underline"
                style={{ color: AUTH_LINK_COLOR }}
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="space-y-5 pt-0">
            <AuthPrimaryButton disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </AuthPrimaryButton>

            <div>
              <AuthSecondaryButton to="/register" linkState={{ from, inviteEmail: state.inviteEmail }}>
                All log in options
              </AuthSecondaryButton>
            </div>
          </div>
        </form>

        <AuthCardFooter>
          Need an account?{' '}
          <Link
            to="/register"
            state={{ from, inviteEmail: state.inviteEmail }}
            className="font-semibold hover:underline"
            style={{ color: AUTH_LINK_COLOR }}
          >
            Create account
          </Link>
        </AuthCardFooter>
      </AuthCard>
    </AuthPageShell>
  )
}
