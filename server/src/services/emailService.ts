import nodemailer from 'nodemailer'
import { config } from '../config'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  if (config.smtp.host && config.smtp.user && config.smtp.pass) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  } else {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    })
  }

  return transporter
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

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111827; margin-bottom: 8px;">You've been invited to join ${params.organizationName} on WorkSync</h2>
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
        <a href="${params.acceptUrl}" style="color: #7c3aed;">${params.acceptUrl}</a>
      </p>
    </div>
  `

  const mail = {
    from: config.smtp.from,
    to: params.to,
    subject: `You've been invited to join ${params.organizationName} on WorkSync`,
    html,
  }

  const transport = getTransporter()
  const result = await transport.sendMail(mail)

  if (!config.smtp.host) {
    console.log('[email] Invitation (dev — no SMTP configured):', JSON.stringify(result, null, 2))
    console.log('[email] Accept URL:', params.acceptUrl)
  }
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

  const mail = {
    from: config.smtp.from,
    to: params.to,
    subject: 'Reset your WorkSync password',
    html,
  }

  const transport = getTransporter()
  const result = await transport.sendMail(mail)

  if (!config.smtp.host) {
    console.log('[email] Password reset (dev — no SMTP configured):', JSON.stringify(result, null, 2))
    console.log('[email] Reset URL:', params.resetUrl)
  }
}
