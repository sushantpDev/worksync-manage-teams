import type { Response } from 'express'
import { Membership, type MembershipRole } from '../models/Membership'
import { Project } from '../models/Project'
import { Task } from '../models/Task'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import {
  buildAccessibleProjectsFilter,
  getAccessibleProjectIds,
  mergeProjectListFilters,
} from '../services/projectAccessService'
import {
  buildContainsRegex,
  clampSearchLimit,
  normalizeSearchQuery,
  rankByQueryMatch,
} from '../utils/search'

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

function serializeUserSummary(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

async function searchProjects(
  orgId: string,
  userId: string,
  role: MembershipRole,
  query: string,
  limit: number
) {
  const regex = buildContainsRegex(query)
  const accessFilter = await buildAccessibleProjectsFilter(orgId, userId, role)
  const textFilter = {
    $or: [{ name: regex }, { description: regex }],
  }
  const filter = mergeProjectListFilters(accessFilter, textFilter)

  const projects = await Project.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit * 2)
    .select('name status dueDate ownerId')

  const ownerIds = projects.map((p) => p.ownerId.toString())
  const owners = await User.find({ _id: { $in: ownerIds } })
  const ownerMap = new Map(owners.map((u) => [u._id.toString(), u]))

  const ranked = rankByQueryMatch(projects, (p) => p.name, query).slice(0, limit)

  return ranked.map((project) => {
    const owner = ownerMap.get(project.ownerId.toString())
    return {
      id: project._id.toString(),
      name: project.name,
      status: project.status,
      dueDate: project.dueDate.toISOString(),
      owner: owner ? serializeUserSummary(owner) : null,
    }
  })
}

async function searchTasks(
  orgId: string,
  userId: string,
  role: MembershipRole,
  query: string,
  limit: number
) {
  const regex = buildContainsRegex(query)
  const filter: Record<string, unknown> = {
    organizationId: orgId,
    $or: [{ title: regex }, { description: regex }],
  }

  if (!canViewAllTasks(role)) {
    filter.assigneeId = userId
  }

  const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, role)
  if (accessibleProjectIds !== null) {
    if (accessibleProjectIds.length === 0) {
      return []
    }
    filter.projectId = { $in: accessibleProjectIds }
  }

  const tasks = await Task.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit * 2)
    .select('title status priority projectId assigneeId')

  const projectIds = [...new Set(tasks.map((t) => t.projectId.toString()))]
  const projects = await Project.find({ _id: { $in: projectIds }, organizationId: orgId }).select(
    'name'
  )
  const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]))

  const accessibleTasks = tasks.filter((task) => projectMap.has(task.projectId.toString()))
  const assigneeIds = accessibleTasks
    .map((t) => t.assigneeId?.toString())
    .filter((id): id is string => Boolean(id))
  const assignees = await User.find({ _id: { $in: assigneeIds } })
  const assigneeMap = new Map(assignees.map((u) => [u._id.toString(), u]))

  const ranked = rankByQueryMatch(accessibleTasks, (t) => t.title, query).slice(0, limit)

  return ranked.map((task) => {
    const projectId = task.projectId.toString()
    const assigneeId = task.assigneeId?.toString()
    const assignee = assigneeId ? assigneeMap.get(assigneeId) : undefined

    return {
      id: task._id.toString(),
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectId,
      projectName: projectMap.get(projectId) ?? 'Unknown project',
      assignee: assignee ? serializeUserSummary(assignee) : null,
    }
  })
}

function canViewAllTasks(role: MembershipRole): boolean {
  return role === 'admin' || role === 'manager'
}

async function searchPeople(orgId: string, query: string, limit: number) {
  const regex = buildContainsRegex(query)
  const memberships = await Membership.find({ organizationId: orgId })
  const userIds = memberships.map((m) => m.userId)
  const roleMap = new Map(memberships.map((m) => [m.userId.toString(), m.role]))

  const users = await User.find({
    _id: { $in: userIds },
    $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
  })
    .select('firstName lastName email avatarUrl')
    .limit(limit * 2)

  const ranked = rankByQueryMatch(
    users,
    (u) => `${u.firstName} ${u.lastName} ${u.email}`,
    query
  ).slice(0, limit)

  return ranked.map((user) => {
    const id = user._id.toString()
    return {
      id,
      userId: id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: roleMap.get(id) ?? 'member',
    }
  })
}

export async function globalSearch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId
    const role = getRole(req)
    const query = normalizeSearchQuery(req.query.q)

    if (!query) {
      res.json({ projects: [], tasks: [], people: [] })
      return
    }

    const limit = clampSearchLimit(req.query.limit)

    const [projects, tasks, people] = await Promise.all([
      searchProjects(orgId, userId, role, query, limit),
      searchTasks(orgId, userId, role, query, limit),
      searchPeople(orgId, query, limit),
    ])

    res.json({ projects, tasks, people })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
