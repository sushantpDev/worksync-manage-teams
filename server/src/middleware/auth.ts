import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, type TokenPayload } from '../utils/jwt'
import type { MembershipRole, IMembership } from '../models/Membership'
import { getMembershipForUser } from '../services/membershipService'

export interface AuthRequest extends Request {
  user?: TokenPayload
  membership?: IMembership
  organizationId?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function authorize(...roles: MembershipRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const role = req.membership?.role ?? req.user.role

    if (roles.length > 0 && !roles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    next()
  }
}

/**
 * Resolves tenant context from JWT + optional X-Organization-Id header.
 * Always verifies membership in the database — never trusts client-supplied org IDs alone.
 */
export async function resolveTenant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const headerOrgId = req.headers['x-organization-id']
  const requestedOrgId =
    (typeof headerOrgId === 'string' ? headerOrgId : undefined) || req.user.organizationId

  if (!requestedOrgId) {
    res.status(403).json({ error: 'Organization context required' })
    return
  }

  if (!/^[a-f\d]{24}$/i.test(requestedOrgId)) {
    res.status(400).json({ error: 'Invalid organization id' })
    return
  }

  try {
    const membership = await getMembershipForUser(req.user.userId, requestedOrgId)

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this organization' })
      return
    }

    req.membership = membership
    req.organizationId = membership.organizationId.toString()
    req.user.organizationId = req.organizationId
    req.user.role = membership.role
    next()
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

/** @deprecated Use resolveTenant */
export const tenantScope = resolveTenant
