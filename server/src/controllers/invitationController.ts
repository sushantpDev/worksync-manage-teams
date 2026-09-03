import type { Response } from 'express'
import { Invitation } from '../models/Invitation'
import { Membership, type MembershipRole } from '../models/Membership'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import { getMembershipForUser } from '../services/membershipService'
import { config } from '../config'
import { sendInvitationEmail } from '../services/emailService'
import { generateInvitationToken, hashInvitationToken } from '../services/invitationToken'
import { isValidEmail } from '../utils/validation'
import { logActivity } from '../services/activityService'

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function serializeInvitation(inv: InstanceType<typeof Invitation>) {
  return {
    id: inv._id.toString(),
    organizationId: inv.organizationId.toString(),
    email: inv.email,
    role: inv.role,
    invitedBy: inv.invitedBy.toString(),
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }
}

async function requireOrgAdmin(userId: string, orgId: string) {
  const membership = await getMembershipForUser(userId, orgId)
  if (!membership || membership.role !== 'admin') {
    return null
  }
  return membership
}

export async function createInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const { email, role = 'member' } = req.body

    if (!(await requireOrgAdmin(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Only organization admins can invite members' })
      return
    }

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email is required' })
      return
    }

    const allowedRoles: MembershipRole[] = ['admin', 'manager', 'member', 'viewer']
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      const existingMembership = await Membership.findOne({
        userId: existingUser._id,
        organizationId: orgId,
      })
      if (existingMembership) {
        res.status(409).json({ error: 'This email is already a member of the organization' })
        return
      }
    }

    const duplicatePending = await Invitation.findOne({
      organizationId: orgId,
      email: normalizedEmail,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
    if (duplicatePending) {
      res.status(409).json({ error: 'An active invitation already exists for this email' })
      return
    }

    const rawToken = generateInvitationToken()
    const tokenHash = hashInvitationToken(rawToken)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + config.invitationExpiryDays)

    const invitation = await Invitation.create({
      organizationId: orgId,
      email: normalizedEmail,
      role,
      invitedBy: req.user!.userId,
      tokenHash,
      status: 'pending',
      expiresAt,
    })

    const organization = await Organization.findById(orgId)
    const inviter = await User.findById(req.user!.userId)
    const acceptUrl = `${config.clientUrl}/invite/${rawToken}`

    await sendInvitationEmail({
      to: normalizedEmail,
      organizationName: organization?.name ?? 'your organization',
      inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team admin',
      role,
      expiresAt,
      acceptUrl,
    })

    res.status(201).json(serializeInvitation(invitation))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function listInvitations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)

    if (!(await requireOrgAdmin(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Only organization admins can view invitations' })
      return
    }

    const invitations = await Invitation.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .limit(100)

    const now = new Date()
    for (const inv of invitations) {
      if (inv.status === 'pending' && inv.expiresAt < now) {
        inv.status = 'expired'
        await inv.save()
      }
    }

    res.json(invitations.map(serializeInvitation))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function revokeInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const invitationId = paramId(req.params.invitationId)

    if (!(await requireOrgAdmin(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Only organization admins can revoke invitations' })
      return
    }

    const invitation = await Invitation.findOne({
      _id: invitationId,
      organizationId: orgId,
    })

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' })
      return
    }

    if (invitation.status === 'accepted') {
      res.status(400).json({ error: 'Cannot revoke an accepted invitation' })
      return
    }

    invitation.status = 'revoked'
    await invitation.save()

    res.json(serializeInvitation(invitation))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getInvitationByToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const token = paramId(req.params.token)
    const tokenHash = hashInvitationToken(token)

    const invitation = await Invitation.findOne({ tokenHash })
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' })
      return
    }

    if (invitation.status === 'pending' && invitation.expiresAt < new Date()) {
      invitation.status = 'expired'
      await invitation.save()
    }

    const organization = await Organization.findById(invitation.organizationId)
    const inviter = await User.findById(invitation.invitedBy)

    res.json({
      id: invitation._id.toString(),
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      organization: organization
        ? {
            id: organization._id.toString(),
            name: organization.name,
          }
        : null,
      inviter: inviter
        ? {
            firstName: inviter.firstName,
            lastName: inviter.lastName,
          }
        : null,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function acceptInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const token = paramId(req.params.token)
    const tokenHash = hashInvitationToken(token)
    const userId = req.user!.userId

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const invitation = await Invitation.findOne({ tokenHash })
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' })
      return
    }

    if (invitation.status !== 'pending') {
      res.status(400).json({ error: `Invitation is ${invitation.status}` })
      return
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired'
      await invitation.save()
      res.status(400).json({ error: 'Invitation has expired' })
      return
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      res.status(403).json({
        error: 'This invitation was sent to a different email address. Sign in with the invited email.',
      })
      return
    }

    const existingMembership = await Membership.findOne({
      userId: user._id,
      organizationId: invitation.organizationId,
    })
    if (existingMembership) {
      invitation.status = 'accepted'
      await invitation.save()
      res.status(409).json({ error: 'You are already a member of this organization' })
      return
    }

    const membership = await Membership.create({
      userId: user._id,
      organizationId: invitation.organizationId,
      role: invitation.role,
    })

    invitation.status = 'accepted'
    await invitation.save()

    await logActivity({
      organizationId: invitation.organizationId.toString(),
      actorId: userId,
      type: 'member_added',
      message: `joined the organization via invitation`,
      metadata: { userId, role: invitation.role },
    })

    const organization = await Organization.findById(invitation.organizationId)
    user.defaultOrganizationId = invitation.organizationId
    await user.save()

    const { generateAccessToken, generateRefreshToken } = await import('../utils/jwt')
    const tokenPayload = {
      userId: user._id.toString(),
      organizationId: invitation.organizationId.toString(),
      role: membership.role,
      email: user.email,
    }
    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)
    user.refreshToken = refreshToken
    await user.save()

    res.json({
      message: 'Invitation accepted',
      membership: {
        organizationId: invitation.organizationId.toString(),
        role: membership.role,
      },
      organization: organization
        ? {
            id: organization._id.toString(),
            name: organization.name,
            slug: organization.slug,
            plan: organization.plan,
            createdAt: organization.createdAt.toISOString(),
          }
        : null,
      accessToken,
      refreshToken,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
