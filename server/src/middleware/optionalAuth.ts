import type { Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import type { AuthRequest } from './auth'

/** Attaches user when a valid Bearer token is present; never rejects. */
export function optionalAuthenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

  if (token) {
    try {
      req.user = verifyAccessToken(token)
    } catch {
      // Ignore invalid/expired access tokens for optional auth routes.
    }
  }

  next()
}
