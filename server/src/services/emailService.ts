import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { config } from '../config'

let resendClient: Resend | null = null
let transporter: nodemailer.Transporter | null = null
let usingJsonTransport = false

function isProduction() {
  return config.nodeEnv === 'production'
}

function hasResendConfig() {
  return Boolean(config.resendApiKey && config.emailFrom)
}

function assertProductionResendConfig() {
  const missing: string[] = []
  if (!config.resendApiKey) missing.push('RESEND_API_KEY')
  if (!config.emailFrom) missing.push('EMAIL_FROM')

  if (missing.length > 0) {
    throw new Error(
      `Resend email service is not fully configured in production (missing: ${missing.join(', ')})`
    )
  }
}

function shouldUseResend() {
  if (isProduction()) return true
  return hasResendConfig()
}

function getResendClient() {
  if (isProduction()) {
    assertProductionResendConfig()
  }

  if (!config.resendApiKey) {
    throw new Error('Resend email service is not fully configured')
  }

  if (!resendClient) {
    resendClient = new Resend(config.resendApiKey)
  }

  return resendClient
}

function hasRealSmtpConfig() {
  return Boolean(
    config.smtp.host &&
      config.smtp.user &&
      config.smtp.pass &&
      config.smtp.from &&
      Number.isFinite(config.smtp.port)
  )
}

function getDevTransporter() {
  if (transporter) return transporter

  if (hasRealSmtpConfig()) {
    const isStartTls = config.smtp.port === 587 && !config.smtp.secure

    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      requireTLS: isStartTls,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    })
    usingJsonTransport = false
    console.log('[email] Dev SMTP configured')
    console.log(`host: ${config.smtp.host}`)
    console.log(`port: ${config.smtp.port}`)
    console.log(`from: ${config.smtp.from}`)
  } else {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    })
    usingJsonTransport = true
    console.log('[email] Using jsonTransport fallback (development only)')
  }

  return transporter
}

function getSenderAddress() {
  if (shouldUseResend() && config.emailFrom) {
    return config.emailFrom
  }
  return config.smtp.from || config.emailFrom || 'WorkSync <noreply@worksync.app>'
}

function safeErrorMessage(error: unknown): string {
  if (!error) return 'Unknown email error'

  let message = ''
  if (error instanceof Error && error.message) {
    message = error.message
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String((error as { message: unknown }).message)
  } else {
    message = String(error)
  }

  if (config.resendApiKey) {
    message = message.split(config.resendApiKey).join('[redacted]')
  }
  if (config.smtp.pass) {
    message = message.split(config.smtp.pass).join('[redacted]')
  }
  if (config.smtp.user) {
    message = message.split(config.smtp.user).join('[redacted]')
  }

  return message || 'Unknown email error'
}

async function sendWithResend(params: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const resend = getResendClient()
  const from = getSenderAddress()

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  })

  if (error) {
    console.error('[email] Resend send failed:', safeErrorMessage(error))
    throw new Error('Email delivery failed')
  }

  return data
}

async function sendWithDevFallback(params: {
  to: string
  subject: string
  html: string
  text: string
  debugLabel: string
  debugUrl?: string
}) {
  const transport = getDevTransporter()
  const result = await transport.sendMail({
    from: getSenderAddress(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  })

  if (usingJsonTransport) {
    console.log(`[email] ${params.debugLabel} (dev — no email provider configured):`, JSON.stringify(result, null, 2))
    if (params.debugUrl) {
      console.log(`[email] URL:`, params.debugUrl)
    }
  }
}

async function deliverEmail(params: {
  to: string
  subject: string
  html: string
  text: string
  debugLabel: string
  debugUrl?: string
}) {
  if (shouldUseResend()) {
    if (isProduction() || hasResendConfig()) {
      await sendWithResend(params)
      return
    }
  }

  if (isProduction()) {
    throw new Error('Resend email service is not fully configured in production')
  }

  await sendWithDevFallback(params)
}

export async function verifyEmailService(): Promise<void> {
  try {
    if (isProduction()) {
      assertProductionResendConfig()
      console.log('[email] Resend configured')
      console.log(`from: ${config.emailFrom}`)
      return
    }

    if (hasResendConfig()) {
      console.log('[email] Resend configured (development)')
      console.log(`from: ${config.emailFrom}`)
      return
    }

    if (hasRealSmtpConfig()) {
      console.log('[email] Dev SMTP available as fallback')
      return
    }

    console.log('[email] No Resend/SMTP configured — using jsonTransport console fallback in development')
  } catch (error) {
    console.error(`[email] Email service verification failed: ${safeErrorMessage(error)}`)
  }
}

/** @deprecated Use verifyEmailService */
export async function verifyEmailTransport(): Promise<void> {
  return verifyEmailService()
}

export async function sendInvitationEmail(params: {
  to: string
  organizationName: string
  inviterName: string
  role: string
  expiresAt: Date
  acceptUrl: string
}): Promise<void> {
  const expiresLabel = params.expiresAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const subject = `You're invited to join ${params.organizationName} on WorkSync`

  const text = [
    `You're invited to join ${params.organizationName} on WorkSync`,
    '',
    `${params.inviterName} invited you to join ${params.organizationName} as a ${params.role}.`,
    `This invitation expires on ${expiresLabel}.`,
    '',
    `Accept the invitation:`,
    params.acceptUrl,
    '',
    'If you were not expecting this invitation, you can ignore this email.',
    '',
    'WorkSync',
  ].join('\n')

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111827; margin-bottom: 8px;">You're invited to join ${params.organizationName} on WorkSync</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        <strong>${params.inviterName}</strong> invited you to join <strong>${params.organizationName}</strong>
        as a <strong>${params.role}</strong>.
      </p>
      <p style="color: #6b7280; font-size: 14px;">This invitation expires on ${expiresLabel}.</p>
      <p style="margin: 28px 0;">
        <a href="${params.acceptUrl}"
           style="background: #111827; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Accept Invitation
        </a>
      </p>
      <p style="color: #9ca3af; font-size: 12px;">
        If the button doesn't work, copy this link:<br />
        <a href="${params.acceptUrl}" style="color: #1a56db;">${params.acceptUrl}</a>
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        If you were not expecting this invitation, you can ignore this email.
      </p>
    </div>
  `

  await deliverEmail({
    to: params.to,
    subject,
    html,
    text,
    debugLabel: 'Invitation',
    debugUrl: params.acceptUrl,
  })
}

export async function sendPasswordResetEmail(params: {
  to: string
  firstName: string
  resetUrl: string
  expiresInMinutes: number
}): Promise<void> {
  const lockIconSvg = `
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="72" height="72" rx="36" fill="#f3f4f6"/>
      <path d="M26 32V28a10 10 0 1 1 20 0v4" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="22" y="32" width="28" height="22" rx="4" stroke="#111827" stroke-width="2.5"/>
      <circle cx="36" cy="43" r="2.5" fill="#111827"/>
      <path d="M36 45.5V49" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `

  const subject = 'Reset your WorkSync password'

  const text = [
    `Hi ${params.firstName},`,
    '',
    'We received a request to reset your WorkSync password.',
    '',
    `Reset your password:`,
    params.resetUrl,
    '',
    `This link expires in ${params.expiresInMinutes} minutes.`,
    '',
    "If you didn't request this, you can ignore this email.",
    '',
    'WorkSync',
  ].join('\n')

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Reset your WorkSync password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Inter, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background-color: #1a56db; padding: 20px 24px; text-align: center;">
                    <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">worksync<span style="opacity: 0.9;">.</span></span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px 8px; text-align: center;">
                    ${lockIconSvg}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 32px 0;">
                    <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${params.firstName},</p>
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 1.65;">
                      We received a request to reset your WorkSync password.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 24px; text-align: center;">
                    <a href="${params.resetUrl}"
                       style="display: inline-block; background-color: #1a56db; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      This link expires in ${params.expiresInMinutes} minutes.
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      If you didn't request this, you can ignore this email.
                    </p>
                    <p style="margin: 24px 0 0; color: #111827; font-size: 14px; line-height: 1.6;">
                      WorkSync
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px 28px; border-top: 1px solid #f3f4f6; text-align: center;">
                    <p style="margin: 0 0 8px; color: #1a56db; font-size: 14px; font-weight: 700;">worksync.</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} WorkSync. All rights reserved.</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5; max-width: 560px;">
                If the button doesn't work, copy this link into your browser:<br />
                <a href="${params.resetUrl}" style="color: #1a56db; word-break: break-all;">${params.resetUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  await deliverEmail({
    to: params.to,
    subject,
    html,
    text,
    debugLabel: 'Password reset',
    debugUrl: params.resetUrl,
  })
}
