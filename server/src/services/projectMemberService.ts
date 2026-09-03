import type { Types } from 'mongoose'
import { Membership } from '../models/Membership'
import { Team } from '../models/Team'
import type { IProject } from '../models/Project'

type TeamLike = { memberIds: Array<Types.ObjectId | string> }

export function normalizeTeamIds(project: IProject): string[] {
  const ids = (project.teamIds ?? []).map((id) => id.toString())
  const legacyTeamId = (project as IProject & { teamId?: Types.ObjectId }).teamId
  if (legacyTeamId && ids.length === 0) {
    return [legacyTeamId.toString()]
  }
  return [...new Set(ids)]
}

export function resolveEffectiveMemberIds(
  manualMemberIds: string[],
  teams: TeamLike[]
): string[] {
  const ids = new Set(manualMemberIds.map(String))
  for (const team of teams) {
    for (const memberId of team.memberIds) {
      ids.add(memberId.toString())
    }
  }
  return [...ids]
}

export function resolveAssignableUserIds(ownerId: string, effectiveMemberIds: string[]): string[] {
  const ids = new Set(effectiveMemberIds.map(String))
  ids.add(ownerId)
  return [...ids]
}

export async function validateOrgMemberIds(orgId: string, memberIds: string[]): Promise<boolean> {
  if (memberIds.length === 0) return true

  const uniqueIds = [...new Set(memberIds.map(String))]
  const memberships = await Membership.find({
    organizationId: orgId,
    userId: { $in: uniqueIds },
  })

  return memberships.length === uniqueIds.length
}

export async function validateTeamIds(orgId: string, teamIds: string[]): Promise<boolean> {
  if (teamIds.length === 0) return true

  const uniqueIds = [...new Set(teamIds.map(String))]
  const count = await Team.countDocuments({
    _id: { $in: uniqueIds },
    organizationId: orgId,
  })

  return count === uniqueIds.length
}

export async function loadTeamsForProject(orgId: string, teamIds: string[]) {
  if (teamIds.length === 0) return []

  return Team.find({
    _id: { $in: teamIds },
    organizationId: orgId,
  })
}

export async function isValidProjectAssignee(
  orgId: string,
  project: IProject,
  assigneeId: string
): Promise<boolean> {
  const teamIds = normalizeTeamIds(project)
  const teams = await loadTeamsForProject(orgId, teamIds)
  const manualMemberIds = project.memberIds.map((id) => id.toString())
  const effectiveMemberIds = resolveEffectiveMemberIds(manualMemberIds, teams)
  const assignableIds = resolveAssignableUserIds(project.ownerId.toString(), effectiveMemberIds)

  return assignableIds.includes(String(assigneeId))
}
