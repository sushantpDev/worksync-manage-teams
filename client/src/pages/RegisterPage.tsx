import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { AuthField } from '../components/auth/AuthField'
import {
  AUTH_LINK_COLOR,
  AuthCard,
  AuthCardFooter,
  AuthCardTitle,
  AuthPageShell,
  AuthPrimaryButton,
} from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { inviteStorage } from '../lib/inviteStorage'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as { from?: string; inviteEmail?: string } | null) ?? {}
  const from = state.from ?? '/dashboard'
  const fromInvite = Boolean(state.from?.startsWith('/invite/'))

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: state.inviteEmail ?? '',
    password: '',
    organizationName: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (fromInvite && state.from) {
      inviteStorage.setReturnPath(state.from)
    }
  }, [fromInvite, state.from])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        organizationName: fromInvite ? undefined : form.organizationName || undefined,
      })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardTitle>Create account</AuthCardTitle>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-[#6b7280]">
          {fromInvite
            ? 'Create your account, then accept the invitation to join the team.'
            : 'Start managing projects with your team.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <AuthField
              label="First name"
              type="text"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
            <AuthField
              label="Last name"
              type="text"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
          </div>

          <AuthField
            label="Work email"
            type="email"
            autoComplete="email"
            required
            readOnly={fromInvite && Boolean(state.inviteEmail)}
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />

          {!fromInvite && (
            <AuthField
              label="Organization"
              type="text"
              autoComplete="organization"
              placeholder="Optional"
              value={form.organizationName}
              onChange={(e) => updateField('organizationName', e.target.value)}
            />
          )}

          <AuthField
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
          />

          <div className="pt-2">
            <AuthPrimaryButton disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </AuthPrimaryButton>
          </div>
        </form>

        <AuthCardFooter>
          Already have an account?{' '}
          <Link
            to="/login"
            state={{ from, inviteEmail: state.inviteEmail }}
            className="font-medium hover:underline"
            style={{ color: AUTH_LINK_COLOR }}
          >
            Sign in
          </Link>
        </AuthCardFooter>
      </AuthCard>
    </AuthPageShell>
  )
}
