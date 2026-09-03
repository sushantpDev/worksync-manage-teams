import type { Response } from 'express'
import mongoose from 'mongoose'
import { Team } from '../models/Team'
import { Membership } from '../models/Membership'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import { getMembershipForUser } from '../services/membershipService'
import {
  collectTeamAccessibleUserIds,
  evictUsersFromTeamChannels,
  notifyTeamAccessUpdated,
} from '../services/communicationSocketService'
import { canManageTeamMembers, requireTeamManagementAccess } from '../services/teamAccessService'

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

async function requireOrgAdmin(userId: string, orgId: string) {
  const membership = await getMembershipForUser(userId, orgId)
  if (!membership || membership.role !== 'admin') {
    return null
  }
  return membership
}

function teamMemberRows(team: InstanceType<typeof Team>, users: InstanceType<typeof User>[]) {
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))
  const leadId = team.leadId?.toString()

  return team.memberIds
    .map((memberId) => {
      const id = memberId.toString()
      const user = userMap.get(id)
      if (!user) return null
      return {
        id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isLead: leadId === id,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
}

async function validateOrgMemberIds(orgId: string, memberIds: string[]): Promise<boolean> {
  if (memberIds.length === 0) return true
  const memberships = await Membership.find({
    organizationId: orgId,
    userId: { $in: memberIds },
  })
  return memberships.length === memberIds.length
}

function serializeUserSummary(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    email: user.email,
  }
}

async function mapTeam(team: InstanceType<typeof Team>) {
  const memberIds = team.memberIds.map((m) => m.toString())
  const userIds = [...memberIds]
  if (team.leadId) userIds.push(team.leadId.toString())
  const users = await User.find({ _id: { $in: userIds } })
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))

  const lead = team.leadId ? userMap.get(team.leadId.toString()) : undefined
  const members = memberIds
    .map((id) => userMap.get(id))
    .filter((u): u is InstanceType<typeof User> => Boolean(u))
    .map(serializeUserSummary)

  return {
    id: team._id.toString(),
    name: team.name,
    description: team.description ?? '',
    organizationId: team.organizationId.toString(),
    memberIds,
    members,
    leadId: team.leadId?.toString(),
    lead: lead ? serializeUserSummary(lead) : null,
    createdBy: team.createdBy.toString(),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  }
}

export async function listTeams(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const membership = await getMembershipForUser(req.user!.userId, orgId)
    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this organization' })
      return
    }

    const userId = req.user!.userId
    const filter: Record<string, unknown> = { organizationId: orgId }

    // Admins and managers can browse every team; others see teams they belong to.
    if (!canManageTeamMembers(membership.role)) {
      const userObjectId = new mongoose.Types.ObjectId(userId)
      filter.$or = [{ memberIds: userObjectId }, { leadId: userObjectId }]
    }

    const teams = await Team.find(filter).sort({ updatedAt: -1 })
    const result = await Promise.all(teams.map(mapTeam))
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function createTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const { name, description, memberIds, leadId } = req.body

    if (!(await requireOrgAdmin(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Only organization admins can create teams' })
      return
    }

    if (!name?.trim()) {
      res.status(400).json({ error: 'Team name is required' })
      return
    }

    const normalizedMembers: string[] = Array.isArray(memberIds)
      ? memberIds.map(String)
      : []

    if (leadId) {
      if (!normalizedMembers.includes(String(leadId))) {
        normalizedMembers.push(String(leadId))
      }
    }

    if (!(await validateOrgMemberIds(orgId, normalizedMembers))) {
      res.status(400).json({ error: 'All team members must belong to this organization' })
      return
    }

    if (leadId && !(await validateOrgMemberIds(orgId, [String(leadId)]))) {
      res.status(400).json({ error: 'Team lead must be an organization member' })
      return
    }

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() ?? '',
      organizationId: orgId,
      memberIds: normalizedMembers,
      leadId: leadId || undefined,
      createdBy: req.user!.userId,
    })

    res.status(201).json(await mapTeam(team))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const teamId = paramId(req.params.teamId)
    const { name, description, memberIds, leadId } = req.body

    if (!(await requireOrgAdmin(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Only organization admins can update teams' })
      return
    }

    const existingTeam = await Team.findOne({ _id: teamId, organizationId: orgId })
    if (!existingTeam) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const previousAccess = collectTeamAccessibleUserIds(
      existingTeam.memberIds,
      existingTeam.leadId
    )

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = String(name).trim()
    if (description !== undefined) updates.description = String(description).trim()
    if (memberIds !== undefined) {
      const normalizedMembers = Array.isArray(memberIds) ? memberIds.map(String) : []
      if (!(await validateOrgMemberIds(orgId, normalizedMembers))) {
        res.status(400).json({ error: 'All team members must belong to this organization' })
        return
      }
      updates.memberIds = normalizedMembers
    }
    if (leadId !== undefined) {
      if (leadId) {
        if (!(await validateOrgMemberIds(orgId, [String(leadId)]))) {
          res.status(400).json({ error: 'Team lead must be an organization member' })
          return
        }
        updates.leadId = leadId
      } else {
        updates.leadId = undefined
      }
    }

    const team = await Team.findOneAndUpdate(
      { _id: teamId, organizationId: orgId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const nextAccess = collectTeamAccessibleUserIds(team.memberIds, team.leadId)
    const removedUserIds = [...previousAccess].filter((id) => !nextAccess.has(id))
    if (removedUserIds.length > 0) {
      await evictUsersFromTeamChannels(orgId, removedUserIds, teamId)
    }

    res.json(await mapTeam(team))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const teamId = paramId(req.params.teamId)

    if (!(await requireOrgAdmin(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Only organization admins can delete teams' })
      return
    }

    const team = await Team.findOne({ _id: teamId, organizationId: orgId })
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const affectedUserIds = [...collectTeamAccessibleUserIds(team.memberIds, team.leadId)]

    const result = await Team.deleteOne({ _id: teamId, organizationId: orgId })
    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    await evictUsersFromTeamChannels(orgId, affectedUserIds, teamId)

    res.json({ message: 'Team deleted' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

async function getTeamInOrg(orgId: string, teamId: string) {
  return Team.findOne({ _id: teamId, organizationId: orgId })
}

export async function addTeamMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const teamId = paramId(req.params.teamId)
    const { userId: targetUserId } = req.body

    if (!(await requireTeamManagementAccess(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    if (!targetUserId) {
      res.status(400).json({ error: 'userId is required' })
      return
    }

    const team = await getTeamInOrg(orgId, teamId)
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const targetId = String(targetUserId)
    if (!(await validateOrgMemberIds(orgId, [targetId]))) {
      res.status(400).json({ error: 'User must be an organization member' })
      return
    }

    if (team.memberIds.some((id) => id.toString() === targetId)) {
      res.status(409).json({ error: 'User is already a member of this team' })
      return
    }

    team.memberIds.push(new mongoose.Types.ObjectId(targetId))
    await team.save()

    notifyTeamAccessUpdated(orgId, targetId, teamId)

    const mapped = await mapTeam(team)
    res.status(201).json(mapped)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function removeTeamMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const teamId = paramId(req.params.teamId)
    const targetUserId = paramId(req.params.userId)

    if (!(await requireTeamManagementAccess(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const team = await getTeamInOrg(orgId, teamId)
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const memberIndex = team.memberIds.findIndex((id) => id.toString() === targetUserId)
    if (memberIndex < 0) {
      res.status(404).json({ error: 'User is not a member of this team' })
      return
    }

    team.memberIds.splice(memberIndex, 1)
    if (team.leadId?.toString() === targetUserId) {
      team.leadId = undefined
    }
    await team.save()

    await evictUsersFromTeamChannels(orgId, [targetUserId], teamId)

    res.json(await mapTeam(team))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateTeamLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const teamId = paramId(req.params.teamId)
    const { userId: leadUserId } = req.body

    if (!(await requireTeamManagementAccess(req.user!.userId, orgId))) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const team = await getTeamInOrg(orgId, teamId)
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    if (leadUserId === null || leadUserId === undefined || leadUserId === '') {
      team.leadId = undefined
      await team.save()
      res.json(await mapTeam(team))
      return
    }

    const targetId = String(leadUserId)
    if (!(await validateOrgMemberIds(orgId, [targetId]))) {
      res.status(400).json({ error: 'Team lead must be an organization member' })
      return
    }

    const isMember = team.memberIds.some((id) => id.toString() === targetId)
    if (!isMember) {
      team.memberIds.push(new mongoose.Types.ObjectId(targetId))
    }

    team.leadId = new mongoose.Types.ObjectId(targetId)
    await team.save()

    notifyTeamAccessUpdated(orgId, targetId, teamId)

    res.json(await mapTeam(team))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function listTeamMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = paramId(req.params.id)
    const teamId = paramId(req.params.teamId)

    const membership = await getMembershipForUser(req.user!.userId, orgId)
    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this organization' })
      return
    }

    const team = await getTeamInOrg(orgId, teamId)
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const userId = req.user!.userId
    const canViewAll = canManageTeamMembers(membership.role)
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const isTeamMember =
      team.memberIds.some((id) => id.equals(userObjectId)) ||
      (team.leadId && team.leadId.equals(userObjectId))

    if (!canViewAll && !isTeamMember) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const userIds = team.memberIds.map((id) => id.toString())
    const users = await User.find({ _id: { $in: userIds } })

    res.json({
      teamId: team._id.toString(),
      leadId: team.leadId?.toString() ?? null,
      members: teamMemberRows(team, users),
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
