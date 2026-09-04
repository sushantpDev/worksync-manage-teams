import type { Request, Response } from 'express'
import { config } from '../config'

export const REFRESH_COOKIE_NAME = 'worksync_refresh'

const REFRESH_COOKIE_MAX_AGE_MS = parseExpiryToMs(config.jwt.refreshExpiry)

function parseExpiryToMs(value: string): number {
  const match = value.trim().match(/^(\d+)\s*([smhd])?$/i)
  if (!match) return 7 * 24 * 60 * 60 * 1000

  const amount = Number(match[1])
  const unit = match[2]?.toLowerCase() ?? 's'

  switch (unit) {
    case 's':
      return amount * 1000
    case 'm':
      return amount * 60 * 1000
    case 'h':
      return amount * 60 * 60 * 1000
    case 'd':
      return amount * 24 * 60 * 60 * 1000
    default:
      return 7 * 24 * 60 * 60 * 1000
  }
}

function cookieOptions() {
  const isProduction = config.nodeEnv === 'production'

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/api/auth',
  }
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  })
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions())
}

export function getRefreshCookie(req: Request): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=')
    if (separatorIndex === -1) continue

    const name = cookie.slice(0, separatorIndex).trim()
    if (name !== REFRESH_COOKIE_NAME) continue

    try {
      return decodeURIComponent(cookie.slice(separatorIndex + 1).trim())
    } catch {
      return null
    }
  }

  return null
}
