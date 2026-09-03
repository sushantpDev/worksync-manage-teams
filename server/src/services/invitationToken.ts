import crypto from 'crypto'

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
