import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { config } from '../config'
import { normalizeEmail } from '../utils/validation'

function clientIp(req: Request): string {
  return ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown')
}

function createAuthRateLimiter(options: {
  windowMinutes: number
  max: number
  message: string
  skipSuccessfulRequests?: boolean
  keyGenerator?: (req: Request) => string
}) {
  return rateLimit({
    windowMs: options.windowMinutes * 60 * 1000,
    max: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    keyGenerator: options.keyGenerator ?? clientIp,
    handler: (_req, res) => {
      res.status(429).json({ message: options.message })
    },
  })
}

export const loginRateLimiter = createAuthRateLimiter({
  windowMinutes: config.rateLimit.login.windowMinutes,
  max: config.rateLimit.login.max,
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true,
})

export const registerRateLimiter = createAuthRateLimiter({
  windowMinutes: config.rateLimit.register.windowMinutes,
  max: config.rateLimit.register.max,
  message: 'Too many registration attempts. Please try again later.',
})

export const forgotPasswordRateLimiter = createAuthRateLimiter({
  windowMinutes: config.rateLimit.forgot.windowMinutes,
  max: config.rateLimit.forgot.max,
  message: 'Too many password reset requests. Please try again later.',
  keyGenerator: (req) => {
    const ip = clientIp(req)
    const email =
      typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : ''
    return email ? `${ip}:${email}` : ip
  },
})

export const resetPasswordRateLimiter = createAuthRateLimiter({
  windowMinutes: config.rateLimit.reset.windowMinutes,
  max: config.rateLimit.reset.max,
  message: 'Too many reset attempts. Please try again later.',
})
