import type { Response } from 'express'
import { Project } from '../models/Project'
import { Team } from '../models/Team'
import { User } from '../models/User'
import { cacheGet, cacheSet, cacheDel } from '../config/redis'
import type { AuthRequest } from '../middleware/auth'
import { logActivity } from '../services/activityService'
import { notifyUsers } from '../services/notificationService'
import {
  loadTeamsForProject,
  normalizeTeamIds,
  resolveEffectiveMemberIds,
  validateOrgMemberIds,
  validateTeamIds,
} from '../services/projectMemberService'
import { deleteProjectAndRelatedData } from '../services/projectDeletionService'
import {
  buildAccessibleProjectsFilter,
  canAccessProject,
  canViewAllProjects,
  mergeProjectListFilters,
  projectListCacheKey,
} from '../services/projectAccessService'
import type { MembershipRole } from '../models/Membership'

const UPDATABLE_FIELDS = [
  'name',
  'description',
  'status',
  'startDate',
  'dueDate',
  'progress',
  'memberIds',
  'ownerId',
  'teamIds',
] as const

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function serializeUserSummary(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

async function buildUserMap(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map<string, InstanceType<typeof User>>()

  const users = await User.find({ _id: { $in: uniqueIds } })
  return new Map(users.map((u) => [u._id.toString(), u]))
}

async function loadTeamsMap(orgId: string, projects: InstanceType<typeof Project>[]) {
  const teamIds = [...new Set(projects.flatMap((project) => normalizeTeamIds(project)))]
  if (teamIds.length === 0) return new Map<string, InstanceType<typeof Team>>()

  const teams = await Team.find({ _id: { $in: teamIds }, organizationId: orgId })
  return new Map(teams.map((team) => [team._id.toString(), team]))
}

function mapProject(
  p: InstanceType<typeof Project>,
  userMap: Map<string, InstanceType<typeof User>>,
  teamsMap: Map<string, InstanceType<typeof Team>>
) {
  const ownerId = p.ownerId.toString()
  const owner = userMap.get(ownerId)
  const teamIds = normalizeTeamIds(p)
  const teamDocs = teamIds
    .map((id) => teamsMap.get(id))
    .filter((team): team is InstanceType<typeof Team> => Boolean(team))
  const teams = teamDocs.map((team) => ({
    id: team._id.toString(),
    name: team.name,
    memberIds: team.memberIds.map((memberId) => memberId.toString()),
  }))

  const manualMemberIds = p.memberIds.map((memberId) => memberId.toString())
  const effectiveMemberIds = resolveEffectiveMemberIds(manualMemberIds, teamDocs)
  const members = effectiveMemberIds
    .filter((id) => id !== ownerId)
    .map((id) => userMap.get(id))
    .filter((user): user is InstanceType<typeof User> => Boolean(user))
    .map(serializeUserSummary)

  return {
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    organizationId: p.organizationId.toString(),
    ownerId,
    owner: owner ? serializeUserSummary(owner) : null,
    teamIds,
    teams,
    status: p.status,
    progress: p.status === 'completed' ? 100 : p.progress,
    startDate: p.startDate.toISOString(),
    dueDate: p.dueDate.toISOString(),
    taskCount: p.taskCount,
    completedTaskCount: p.completedTaskCount,
    memberIds: manualMemberIds,
    members,
    createdBy: p.createdBy.toString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

function collectUserIdsFromProjects(
  projects: InstanceType<typeof Project>[],
  teamsMap: Map<string, InstanceType<typeof Team>>
) {
  const ids: string[] = []
  for (const project of projects) {
    ids.push(project.ownerId.toString(), project.createdBy.toString())
    project.memberIds.forEach((memberId) => ids.push(memberId.toString()))

    for (const teamId of normalizeTeamIds(project)) {
      const team = teamsMap.get(teamId)
      team?.memberIds.forEach((memberId) => ids.push(memberId.toString()))
    }
  }
  return ids
}

function pickUpdates(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {}
  for (const key of UPDATABLE_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = body[key]
    }
  }
  return updates
}

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

async function serializeProjects(orgId: string, projects: InstanceType<typeof Project>[]) {
  const teamsMap = await loadTeamsMap(orgId, projects)
  const userMap = await buildUserMap(collectUserIdsFromProjects(projects, teamsMap))
  return projects.map((project) => mapProject(project, userMap, teamsMap))
}

export async function listProjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId
    const role = getRole(req)
    const hasFilters = req.query.status || req.query.search || req.query.teamId
    const useCache = !hasFilters && canViewAllProjects(role)
    const cacheKey = projectListCacheKey(orgId, userId, role)

    if (useCache) {
      const cached = await cacheGet<unknown[]>(cacheKey)
      if (cached) {
        res.json(cached)
        return
      }
    }

    const accessFilter = await buildAccessibleProjectsFilter(orgId, userId, role)
    const extraFilter: Record<string, unknown> = {}

    if (req.query.status && req.query.status !== 'all') {
      extraFilter.status = req.query.status
    }

    if (req.query.search && typeof req.query.search === 'string') {
      const q = req.query.search.trim()
      if (q) {
        extraFilter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ]
      }
    }

    if (req.query.teamId) {
      extraFilter.teamIds = req.query.teamId
    }

    const filter = mergeProjectListFilters(accessFilter, extraFilter)

    const projects = await Project.find(filter).sort({ updatedAt: -1 }).limit(200)
    const result = await serializeProjects(orgId, projects)

    if (useCache) {
      await cacheSet(cacheKey, result, 120)
    }
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const projectId = paramId(req.params.id)

    const project = await Project.findOne({
      _id: projectId,
      organizationId: orgId,
    })

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const hasAccess = await canAccessProject({
      project,
      userId: req.user!.userId,
      role: getRole(req),
      organizationId: orgId,
    })

    if (!hasAccess) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const [result] = await serializeProjects(orgId, [project])
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const { name, description, startDate, dueDate, status, memberIds, teamIds, progress } =
      req.body

    if (!name?.trim() || !startDate || !dueDate) {
      res.status(400).json({ error: 'Name, start date, and due date are required' })
      return
    }

    const ownerId = req.user!.userId
    const normalizedMembers = Array.isArray(memberIds)
      ? [...new Set(memberIds.map(String))]
      : []
    const normalizedTeamIds = Array.isArray(teamIds)
      ? [...new Set(teamIds.map(String))]
      : []

    if (!(await validateOrgMemberIds(orgId, normalizedMembers))) {
      res.status(400).json({ error: 'All members must belong to this organization' })
      return
    }

    if (!(await validateTeamIds(orgId, normalizedTeamIds))) {
      res.status(400).json({ error: 'All teams must belong to this organization' })
      return
    }

    const nextStatus = status ?? 'planning'
    const project = await Project.create({
      name: name.trim(),
      description: description?.trim() ?? '',
      organizationId: orgId,
      ownerId,
      createdBy: ownerId,
      teamIds: normalizedTeamIds,
      status: nextStatus,
      progress: nextStatus === 'completed' ? 100 : progress ?? 0,
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      memberIds: normalizedMembers,
    })

    await cacheDel(`projects:list:${orgId}:full`)
    await cacheDel(`projects:list:${orgId}`)

    await logActivity({
      organizationId: orgId,
      projectId: project._id.toString(),
      actorId: ownerId,
      type: 'project_created',
      message: `created project "${project.name}"`,
    })

    const [result] = await serializeProjects(orgId, [project])
    res.status(201).json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const projectId = paramId(req.params.id)
    const updates = pickUpdates(req.body as Record<string, unknown>)

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' })
      return
    }

    if (updates.status === 'archived' && req.membership?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can archive projects' })
      return
    }

    if (updates.memberIds && Array.isArray(updates.memberIds)) {
      const memberIds = [...new Set(updates.memberIds.map(String))]
      if (!(await validateOrgMemberIds(orgId, memberIds))) {
        res.status(400).json({ error: 'All members must belong to this organization' })
        return
      }
      updates.memberIds = memberIds
    }

    if (updates.teamIds && Array.isArray(updates.teamIds)) {
      const teamIds = [...new Set(updates.teamIds.map(String))]
      if (!(await validateTeamIds(orgId, teamIds))) {
        res.status(400).json({ error: 'All teams must belong to this organization' })
        return
      }
      updates.teamIds = teamIds
    }

    if (updates.ownerId) {
      const ownerId = String(updates.ownerId)
      if (!(await validateOrgMemberIds(orgId, [ownerId]))) {
        res.status(400).json({ error: 'Owner must be a member of this organization' })
        return
      }
    }

    if (updates.startDate) updates.startDate = new Date(updates.startDate as string)
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate as string)

    if (updates.status === 'completed') {
      updates.progress = 100
    }

    const existingProject = await Project.findOne({ _id: projectId, organizationId: orgId })
    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const project = await Project.findOneAndUpdate(
      { _id: projectId, organizationId: orgId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    await cacheDel(`projects:list:${orgId}:full`)
    await cacheDel(`projects:list:${orgId}`)

    await logActivity({
      organizationId: orgId,
      projectId: project._id.toString(),
      actorId: req.user!.userId,
      type: 'project_updated',
      message: `updated project "${project.name}"`,
      metadata: { fields: Object.keys(updates).join(',') },
    })

    if (updates.status && updates.status !== existingProject.status) {
      const importantStatuses = ['active', 'on_hold', 'completed', 'archived']
      if (importantStatuses.includes(String(updates.status))) {
        const actorId = req.user!.userId
        const teams = await loadTeamsForProject(orgId, normalizeTeamIds(project))
        const effectiveMemberIds = resolveEffectiveMemberIds(
          project.memberIds.map((memberId) => memberId.toString()),
          teams
        )
        const recipientIds = new Set<string>(effectiveMemberIds)
        const ownerId = project.ownerId.toString()
        recipientIds.add(ownerId)
        recipientIds.delete(actorId)

        await notifyUsers([...recipientIds], {
          organizationId: orgId,
          type: 'project',
          title: 'Project status updated',
          message: `"${project.name}" is now ${project.status.replace('_', ' ')}`,
          projectId: project._id.toString(),
        })
      }
    }

    const [result] = await serializeProjects(orgId, [project])
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateProjectTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const projectId = paramId(req.params.id)
    const { teamIds, memberIds } = req.body

    if (!Array.isArray(teamIds) || !Array.isArray(memberIds)) {
      res.status(400).json({ error: 'teamIds and memberIds must be arrays' })
      return
    }

    const normalizedTeamIds = [...new Set(teamIds.map(String))]
    const normalizedMemberIds = [...new Set(memberIds.map(String))]

    if (!(await validateTeamIds(orgId, normalizedTeamIds))) {
      res.status(400).json({ error: 'All teams must belong to this organization' })
      return
    }

    if (!(await validateOrgMemberIds(orgId, normalizedMemberIds))) {
      res.status(400).json({ error: 'All members must belong to this organization' })
      return
    }

    const existingProject = await Project.findOne({ _id: projectId, organizationId: orgId })
    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const project = await Project.findOneAndUpdate(
      { _id: projectId, organizationId: orgId },
      { $set: { teamIds: normalizedTeamIds, memberIds: normalizedMemberIds } },
      { new: true, runValidators: true }
    )

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    await cacheDel(`projects:list:${orgId}:full`)
    await cacheDel(`projects:list:${orgId}`)

    await logActivity({
      organizationId: orgId,
      projectId: project._id.toString(),
      actorId: req.user!.userId,
      type: 'member_added',
      message: `updated team assignments for "${project.name}"`,
      metadata: {
        teamCount: String(normalizedTeamIds.length),
        memberCount: String(normalizedMemberIds.length),
      },
    })

    const [result] = await serializeProjects(orgId, [project])
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const projectId = paramId(req.params.id)

    const deleted = await deleteProjectAndRelatedData(orgId, projectId)
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    await cacheDel(`projects:list:${orgId}:full`)
    await cacheDel(`projects:list:${orgId}`)
    res.json({ message: 'Project deleted' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
