import type { Response } from 'express'
import { Organization } from '../models/Organization'
import { Membership, type MembershipRole } from '../models/Membership'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import {
  createOrganizationWithAdmin,
  getMembershipForUser,
  getUserMemberships,
} from '../services/membershipService'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt'
import { setRefreshCookie } from '../utils/refreshCookie'
import { isValidEmail, isValidOrganizationName } from '../utils/validation'
import { logActivity } from '../services/activityService'
import {
  assertCanRemoveMember,
  assertNotLastAdmin,
  cleanupAndRemoveMember,
  getMembershipInOrg,
  isValidMembershipRole,
  MemberManagementError,
  requireOrgAdmin,
} from '../services/memberManagementService'
import { evictUserFromOrganization } from '../services/communicationSocketService'

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function serializeOrganization(org: InstanceType<typeof Organization>) {
  return {
    id: org._id.toString(),
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    createdAt: org.createdAt.toISOString(),
  }
}

function serializeMember(
  user: InstanceType<typeof User>,
  role: MembershipRole,
  membershipId?: string
) {
  return {
    id: user._id.toString(),
    membershipId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role,
    joinedAt: undefined as string | undefined,
  }
}

async function issueTokensForMembership(
  user: InstanceType<typeof User>,
  membership: InstanceType<typeof Membership>
) {
  const tokenPayload = {
    userId: user._id.toString(),
    organizationId: membership.organizationId.toString(),
    role: membership.role,
    email: user.email,
  }

  const accessToken = generateAccessToken(tokenPayload)
  const refreshToken = generateRefreshToken(tokenPayload)

  user.refreshToken = refreshToken
  await user.save()

  return { accessToken, refreshToken }
}

export async function createOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name } = req.body
    if (!name?.trim()) {
      res.status(400).json({ error: 'Organization name is required' })
      return
    }

    const { organization, membership } = await createOrganizationWithAdmin(
      req.user!.userId,
      name
    )

    const user = await User.findById(req.user!.userId).select('+refreshToken')
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const tokens = await issueTokensForMembership(user, membership)
    setRefreshCookie(res, tokens.refreshToken)

    res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: membership.role,
        organizationId: organization._id.toString(),
      },
      organization: serializeOrganization(organization),
      membership: {
        organizationId: organization._id.toString(),
        role: membership.role,
      },
      accessToken: tokens.accessToken,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function listOrganizations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const memberships = await getUserMemberships(req.user!.userId)

    res.json(
      memberships.map((m) => {
        const org = m.organizationId as unknown as InstanceType<typeof Organization>
        return {
          organization: serializeOrganization(org),
          role: m.role,
          membershipId: m._id.toString(),
        }
      })
    )
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = paramId(req.params.id)
    const membership = await getMembershipForUser(req.user!.userId, id)

    if (!membership) {
      res.status(404).json({ error: 'Organization not found' })
      return
    }

    const organization = await Organization.findById(id)
    if (!organization) {
      res.status(404).json({ error: 'Organization not found' })
      return
    }

    res.json({
      organization: serializeOrganization(organization),
      role: membership.role,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = paramId(req.params.id)
    const membership = await getMembershipForUser(req.user!.userId, id)

    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ error: 'Only organization admins can update organization settings' })
      return
    }

    const { name } = req.body as { name?: string }

    if (!name || !isValidOrganizationName(name)) {
      res.status(400).json({ error: 'Organization name is required and must be 120 characters or fewer' })
      return
    }

    const organization = await Organization.findById(id)
    if (!organization) {
      res.status(404).json({ error: 'Organization not found' })
      return
    }

    organization.name = name.trim()
    await organization.save()

    res.json({ organization: serializeOrganization(organization) })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function listMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = paramId(req.params.id)
    const membership = await getMembershipForUser(req.user!.userId, id)

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this organization' })
      return
    }

    const memberships = await Membership.find({ organizationId: id })
    const userIds = memberships.map((m) => m.userId)
    const users = await User.find({ _id: { $in: userIds } })

    const userMap = new Map(users.map((u) => [u._id.toString(), u]))

    res.json(
      memberships.map((m) => {
        const user = userMap.get(m.userId.toString())
        if (!user) return null
        return {
          ...serializeMember(user, m.role, m._id.toString()),
          joinedAt: m.createdAt.toISOString(),
        }
      }).filter(Boolean)
    )
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function addMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = paramId(req.params.id)
    const { email, role = 'member' } = req.body

    const callerMembership = await getMembershipForUser(req.user!.userId, id)
    if (!callerMembership || callerMembership.role !== 'admin') {
      res.status(403).json({ error: 'Only organization admins can add members' })
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

    const user = await User.findOne({ email: email.trim().toLowerCase() })
    if (!user) {
      res.status(404).json({ error: 'User not found. They must register first.' })
      return
    }

    const existing = await Membership.findOne({ userId: user._id, organizationId: id })
    if (existing) {
      res.status(409).json({ error: 'User is already a member of this organization' })
      return
    }

    const membership = await Membership.create({
      userId: user._id,
      organizationId: id,
      role,
    })

    await logActivity({
      organizationId: id,
      actorId: req.user!.userId,
      type: 'member_added',
      message: `added ${user.firstName} ${user.lastName} to the organization`,
      metadata: { userId: user._id.toString(), role },
    })

    res.status(201).json({
      member: {
        ...serializeMember(user, membership.role, membership._id.toString()),
        joinedAt: membership.createdAt.toISOString(),
      },
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const membershipId = paramId(req.params.membershipId)
    const { role } = req.body

    await requireOrgAdmin(req.user!.userId, orgId)

    if (!isValidMembershipRole(role)) {
      res.status(400).json({ error: 'Invalid role' })
      return
    }

    const targetMembership = await getMembershipInOrg(orgId, membershipId)
    if (!targetMembership) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    if (targetMembership.role === role) {
      res.status(400).json({ error: 'Member already has this role' })
      return
    }

    if (targetMembership.role === 'admin' && role !== 'admin') {
      await assertNotLastAdmin(orgId, targetMembership, 'demote')
    }

    const previousRole = targetMembership.role
    targetMembership.role = role
    await targetMembership.save()

    const user = await User.findById(targetMembership.userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    await logActivity({
      organizationId: orgId,
      actorId: req.user!.userId,
      type: 'member_role_changed',
      message: `changed ${user.firstName} ${user.lastName}'s role from ${previousRole} to ${role}`,
      metadata: {
        userId: user._id.toString(),
        membershipId: targetMembership._id.toString(),
        previousRole,
        newRole: role,
      },
    })

    res.json({
      member: {
        ...serializeMember(user, targetMembership.role, targetMembership._id.toString()),
        joinedAt: targetMembership.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof MemberManagementError) {
      res.status(error.statusCode).json({
        error: error.message,
        ...(error.details ?? {}),
      })
      return
    }
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const membershipId = paramId(req.params.membershipId)

    await requireOrgAdmin(req.user!.userId, orgId)

    const targetMembership = await getMembershipInOrg(orgId, membershipId)
    if (!targetMembership) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    await assertNotLastAdmin(orgId, targetMembership, 'remove')

    const userId = targetMembership.userId.toString()
    await assertCanRemoveMember(orgId, userId)

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const previousRole = targetMembership.role
    await cleanupAndRemoveMember(orgId, userId, membershipId)
    evictUserFromOrganization(orgId, userId)

    await logActivity({
      organizationId: orgId,
      actorId: req.user!.userId,
      type: 'member_removed',
      message: `removed ${user.firstName} ${user.lastName} from the organization`,
      metadata: {
        userId,
        membershipId,
        previousRole,
      },
    })

    res.json({ message: 'Member removed successfully' })
  } catch (error) {
    if (error instanceof MemberManagementError) {
      res.status(error.statusCode).json({
        error: error.message,
        ...(error.details ?? {}),
      })
      return
    }
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function switchOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = paramId(req.params.id)
    const membership = await getMembershipForUser(req.user!.userId, id)

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this organization' })
      return
    }

    const user = await User.findById(req.user!.userId).select('+refreshToken')
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    user.defaultOrganizationId = membership.organizationId
    const tokens = await issueTokensForMembership(user, membership)
    setRefreshCookie(res, tokens.refreshToken)
    const organization = await Organization.findById(id)

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: membership.role,
        organizationId: id,
      },
      organization: organization ? serializeOrganization(organization) : null,
      role: membership.role,
      accessToken: tokens.accessToken,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
