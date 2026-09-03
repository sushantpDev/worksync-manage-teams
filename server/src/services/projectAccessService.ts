import mongoose from 'mongoose'
import type { MembershipRole } from '../models/Membership'
import type { IProject } from '../models/Project'
import { Project } from '../models/Project'
import { Team } from '../models/Team'
import { loadTeamsForProject, normalizeTeamIds } from './projectMemberService'

type TeamLike = {
  memberIds: Array<{ toString(): string } | string>
  leadId?: { toString(): string } | string | null
}

export function canViewAllProjects(role: MembershipRole): boolean {
  return role === 'admin' || role === 'manager'
}

export async function canAccessProject(params: {
  project: IProject
  userId: string
  role: MembershipRole
  organizationId: string
  teams?: TeamLike[]
}): Promise<boolean> {
  const { project, userId, role, organizationId } = params

  if (project.organizationId.toString() !== organizationId) {
    return false
  }

  if (canViewAllProjects(role)) {
    return true
  }

  if (project.ownerId.toString() === userId) {
    return true
  }

  if (project.memberIds.some((memberId) => memberId.toString() === userId)) {
    return true
  }

  const teamIds = normalizeTeamIds(project)
  if (teamIds.length === 0) {
    return false
  }

  const teams = params.teams ?? (await loadTeamsForProject(organizationId, teamIds))
  for (const team of teams) {
    if (team.leadId?.toString() === userId) {
      return true
    }
    if (team.memberIds.some((memberId) => memberId.toString() === userId)) {
      return true
    }
  }

  return false
}

export async function buildAccessibleProjectsFilter(
  orgId: string,
  userId: string,
  role: MembershipRole
): Promise<Record<string, unknown>> {
  if (canViewAllProjects(role)) {
    return { organizationId: orgId }
  }

  const userObjectId = new mongoose.Types.ObjectId(userId)
  const userTeams = await Team.find({
    organizationId: orgId,
    $or: [{ memberIds: userObjectId }, { leadId: userObjectId }],
  }).select('_id')

  const teamIds = userTeams.map((team) => team._id)
  const orConditions: Record<string, unknown>[] = [
    { ownerId: userObjectId },
    { memberIds: userObjectId },
  ]

  if (teamIds.length > 0) {
    orConditions.push({ teamIds: { $in: teamIds } })
  }

  return {
    organizationId: orgId,
    $or: orConditions,
  }
}

/** Returns null when the role can access every project in the org. */
export async function getAccessibleProjectIds(
  orgId: string,
  userId: string,
  role: MembershipRole
): Promise<string[] | null> {
  if (canViewAllProjects(role)) {
    return null
  }

  const filter = await buildAccessibleProjectsFilter(orgId, userId, role)
  const projects = await Project.find(filter).select('_id')
  return projects.map((project) => project._id.toString())
}

export function mergeProjectListFilters(
  accessFilter: Record<string, unknown>,
  extra: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...accessFilter, ...extra }

  if (accessFilter.$or && extra.$or) {
    const { $or: accessOr, ...accessRest } = accessFilter
    const { $or: extraOr, ...extraRest } = extra
    return {
      ...accessRest,
      ...extraRest,
      $and: [{ $or: accessOr }, { $or: extraOr }],
    }
  }

  return merged
}

export function projectListCacheKey(orgId: string, userId: string, role: MembershipRole): string {
  if (canViewAllProjects(role)) {
    return `projects:list:${orgId}:full`
  }
  return `projects:list:${orgId}:user:${userId}`
}
