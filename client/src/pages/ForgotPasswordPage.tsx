import { Link } from 'react-router-dom'
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
import { isValidEmail } from '../lib/validation'

const SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions."

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!isValidEmail(email)) {
      setError('Enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authApi.forgotPassword(email.trim())
      setSuccessMessage(response.message || SUCCESS_MESSAGE)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send reset link')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardTitle>Forgot your password?</AuthCardTitle>
        <p className="mt-3 text-left text-[14px] leading-relaxed text-[#6b7280]">
          Enter the email associated with your WorkSync account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3.5">
          {successMessage && (
            <div className="rounded-[10px] bg-green-50 px-3 py-2.5 text-sm text-green-800">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="rounded-[10px] bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={Boolean(successMessage)}
          />

          <div className="pt-3">
            <AuthPrimaryButton disabled={isSubmitting || Boolean(successMessage)}>
              {isSubmitting ? 'Sending...' : 'Send reset link'}
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
