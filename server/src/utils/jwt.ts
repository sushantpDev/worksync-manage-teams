import jwt from 'jsonwebtoken'
import { config } from '../config'
import type { MembershipRole } from '../models/Membership'

export interface TokenPayload {
  userId: string
  organizationId: string
  role: MembershipRole
  email: string
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'],
  })
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload
}
