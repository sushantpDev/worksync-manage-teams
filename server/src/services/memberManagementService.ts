import mongoose from 'mongoose'
import type { IMembership, MembershipRole } from '../models/Membership'
import { Membership } from '../models/Membership'
import { Project } from '../models/Project'
import { Task } from '../models/Task'
import { Team } from '../models/Team'
import { cacheDel } from '../config/redis'
import { getMembershipForUser } from './membershipService'

export class MemberManagementError extends Error {
  statusCode: number
  details?: Record<string, unknown>

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message)
    this.name = 'MemberManagementError'
    this.statusCode = statusCode
    this.details = details
  }
}

const ALLOWED_ROLES: MembershipRole[] = ['admin', 'manager', 'member', 'viewer']

export function isValidMembershipRole(role: unknown): role is MembershipRole {
  return typeof role === 'string' && ALLOWED_ROLES.includes(role as MembershipRole)
}

export async function requireOrgAdmin(userId: string, orgId: string): Promise<IMembership> {
  const membership = await getMembershipForUser(userId, orgId)
  if (!membership || membership.role !== 'admin') {
    throw new MemberManagementError('Only organization admins can manage members', 403)
  }
  return membership
}

export async function getMembershipInOrg(
  orgId: string,
  membershipId: string
): Promise<IMembership | null> {
  if (!/^[a-f\d]{24}$/i.test(membershipId)) {
    return null
  }

  return Membership.findOne({ _id: membershipId, organizationId: orgId })
}

export async function countOrgAdmins(orgId: string): Promise<number> {
  return Membership.countDocuments({ organizationId: orgId, role: 'admin' })
}

export async function assertNotLastAdmin(
  orgId: string,
  targetMembership: IMembership,
  action: 'demote' | 'remove'
): Promise<void> {
  if (targetMembership.role !== 'admin') {
    return
  }

  const adminCount = await countOrgAdmins(orgId)
  if (adminCount <= 1) {
    throw new MemberManagementError(
      action === 'remove'
        ? 'Cannot remove the last admin from the organization'
        : 'Cannot change the role of the last admin. Assign another admin first.',
      409
    )
  }
}

export async function assertCanRemoveMember(orgId: string, userId: string): Promise<void> {
  const ownedProjects = await Project.find({ organizationId: orgId, ownerId: userId }).select('name')

  if (ownedProjects.length > 0) {
    const projectList = ownedProjects.map((project) => project.name).join(', ')
    throw new MemberManagementError(
      `Cannot remove member: they own ${ownedProjects.length} project(s). Transfer ownership first: ${projectList}`,
      409,
      {
        ownedProjects: ownedProjects.map((project) => ({
          id: project._id.toString(),
          name: project.name,
        })),
      }
    )
  }
}

export async function cleanupAndRemoveMember(
  orgId: string,
  userId: string,
  membershipId: string
): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId)

  await Team.updateMany({ organizationId: orgId }, { $pull: { memberIds: userObjectId } })
  await Team.updateMany(
    { organizationId: orgId, leadId: userObjectId },
    { $unset: { leadId: 1 } }
  )
  await Project.updateMany({ organizationId: orgId }, { $pull: { memberIds: userObjectId } })
  await Task.updateMany(
    { organizationId: orgId, assigneeId: userObjectId },
    { $unset: { assigneeId: 1 } }
  )

  const result = await Membership.deleteOne({ _id: membershipId, organizationId: orgId })
  if (result.deletedCount === 0) {
    throw new MemberManagementError('Membership not found', 404)
  }

  await cacheDel(`projects:list:${orgId}:full`)
  await cacheDel(`projects:list:${orgId}`)
}
