import type { Response } from 'express'
import { Task } from '../models/Task'
import type { IProject } from '../models/Project'
import { Project } from '../models/Project'
import { User } from '../models/User'
import { cacheDel } from '../config/redis'
import type { AuthRequest } from '../middleware/auth'
import type { MembershipRole } from '../models/Membership'
import { logActivity } from '../services/activityService'
import { createNotification } from '../services/notificationService'
import { getAccessibleProjectInOrg } from '../services/contextValidation'
import { isValidProjectAssignee } from '../services/projectMemberService'
import { deleteTaskAttachmentsByFilter } from '../services/taskAttachmentService'

const ADMIN_MANAGER_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'assigneeId',
  'dueDate',
  'projectId',
  'labels',
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

async function validateProjectAssignee(
  orgId: string,
  project: IProject,
  userId: string
): Promise<boolean> {
  return isValidProjectAssignee(orgId, project, userId)
}

async function requireProjectAccess(req: AuthRequest, projectId: string) {
  return getAccessibleProjectInOrg(req, projectId)
}

async function invalidateProjectCaches(orgId: string) {
  await cacheDel(`projects:list:${orgId}:full`)
  await cacheDel(`projects:list:${orgId}`)
}

async function syncProjectTaskCounts(projectId: string) {
  const [total, completed] = await Promise.all([
    Task.countDocuments({ projectId }),
    Task.countDocuments({ projectId, status: 'done' }),
  ])

  await Project.findByIdAndUpdate(projectId, {
    taskCount: total,
    completedTaskCount: completed,
  })
}

function mapTask(
  t: InstanceType<typeof Task>,
  userMap: Map<string, InstanceType<typeof User>>
) {
  const assigneeId = t.assigneeId?.toString()
  const assignee = assigneeId ? userMap.get(assigneeId) : undefined

  return {
    id: t._id.toString(),
    projectId: t.projectId.toString(),
    organizationId: t.organizationId.toString(),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId,
    assignee: assignee ? serializeUserSummary(assignee) : null,
    dueDate: t.dueDate?.toISOString(),
    labels: t.labels,
    commentCount: t.commentCount,
    attachmentCount: t.attachmentCount,
    createdBy: t.createdBy.toString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

function collectUserIds(tasks: InstanceType<typeof Task>[]) {
  const ids: string[] = []
  for (const t of tasks) {
    if (t.assigneeId) ids.push(t.assigneeId.toString())
    ids.push(t.createdBy.toString())
  }
  return ids
}

async function buildUserMap(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map<string, InstanceType<typeof User>>()
  const users = await User.find({ _id: { $in: uniqueIds } })
  return new Map(users.map((u) => [u._id.toString(), u]))
}

function pickAdminManagerUpdates(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {}
  for (const key of ADMIN_MANAGER_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  return updates
}

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

function canViewAllTasks(role: MembershipRole): boolean {
  return role === 'admin' || role === 'manager'
}

function isTaskAssignedToUser(task: InstanceType<typeof Task>, userId: string): boolean {
  return task.assigneeId?.toString() === userId
}

export async function listTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const role = getRole(req)
    const userId = req.user!.userId
    const filter: Record<string, unknown> = { organizationId: orgId }

    if (req.query.projectId) {
      const projectId = String(req.query.projectId)
      const project = await requireProjectAccess(req, projectId)
      if (!project) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      filter.projectId = projectId
    }
    if (req.query.status) filter.status = req.query.status
    if (req.query.priority) filter.priority = req.query.priority

    if (canViewAllTasks(role)) {
      if (req.query.assigneeId) filter.assigneeId = req.query.assigneeId
    } else {
      filter.assigneeId = userId
    }

    if (req.query.search && typeof req.query.search === 'string') {
      const q = req.query.search.trim()
      if (q) {
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ]
      }
    }

    const tasks = await Task.find(filter).sort({ updatedAt: -1 }).limit(500)
    const userMap = await buildUserMap(collectUserIds(tasks))
    res.json(tasks.map((t) => mapTask(t, userMap)))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const taskId = paramId(req.params.id)

    const task = await Task.findOne({ _id: taskId, organizationId: orgId })
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const role = getRole(req)
    if (!canViewAllTasks(role) && !isTaskAssignedToUser(task, req.user!.userId)) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const project = await requireProjectAccess(req, task.projectId.toString())
    if (!project) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const userMap = await buildUserMap(collectUserIds([task]))
    res.json(mapTask(task, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const { projectId, title, description, status, priority, assigneeId, dueDate, labels } =
      req.body

    if (!projectId || !title?.trim()) {
      res.status(400).json({ error: 'Project ID and title are required' })
      return
    }

    const project = await requireProjectAccess(req, String(projectId))
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    if (assigneeId) {
      if (!(await validateProjectAssignee(orgId, project, String(assigneeId)))) {
        res.status(400).json({ error: 'Assignee must be a member of this project' })
        return
      }
    }

    const createdBy = req.user!.userId

    const task = await Task.create({
      projectId,
      organizationId: orgId,
      title: title.trim(),
      description: description?.trim(),
      status: status ?? 'todo',
      priority: priority ?? 'medium',
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      labels: labels ?? [],
      createdBy,
    })

    await syncProjectTaskCounts(String(projectId))
    await invalidateProjectCaches(orgId)

    await logActivity({
      organizationId: orgId,
      projectId: String(projectId),
      taskId: task._id.toString(),
      actorId: createdBy,
      type: 'task_created',
      message: `created task "${task.title}"`,
    })

    if (assigneeId) {
      await logActivity({
        organizationId: orgId,
        projectId: String(projectId),
        taskId: task._id.toString(),
        actorId: createdBy,
        type: 'task_assigned',
        message: `assigned task "${task.title}"`,
        metadata: { assigneeId: String(assigneeId) },
      })

      if (String(assigneeId) !== createdBy) {
        await createNotification({
          organizationId: orgId,
          userId: String(assigneeId),
          type: 'task',
          title: 'Task assigned',
          message: `You were assigned to "${task.title}"`,
          projectId: String(projectId),
          taskId: task._id.toString(),
        })
      }
    }

    const userMap = await buildUserMap(collectUserIds([task]))
    res.status(201).json(mapTask(task, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const taskId = paramId(req.params.id)
    const role = getRole(req)

    if (role === 'viewer') {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const existing = await Task.findOne({ _id: taskId, organizationId: orgId })
    if (!existing) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    if (role === 'member' && !isTaskAssignedToUser(existing, req.user!.userId)) {
      res.status(403).json({ error: 'You can only update tasks assigned to you' })
      return
    }

    const existingProject = await requireProjectAccess(req, existing.projectId.toString())
    if (!existingProject) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    let updates: Record<string, unknown>

    if (role === 'member') {
      if (req.body.status === undefined) {
        res.status(403).json({ error: 'Members can only update task status' })
        return
      }
      const extraFields = Object.keys(req.body).filter(
        (k) => k !== 'status' && req.body[k] !== undefined
      )
      if (extraFields.length > 0) {
        res.status(403).json({ error: 'Members can only update task status' })
        return
      }
      updates = { status: req.body.status }
    } else {
      updates = pickAdminManagerUpdates(req.body as Record<string, unknown>)
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' })
        return
      }
    }

    if (updates.projectId) {
      const project = await requireProjectAccess(req, String(updates.projectId))
      if (!project) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
    }

    if (updates.assigneeId) {
      const targetProject = updates.projectId
        ? await requireProjectAccess(req, String(updates.projectId))
        : existingProject

      if (!targetProject) {
        res.status(404).json({ error: 'Project not found' })
        return
      }

      if (!(await validateProjectAssignee(orgId, targetProject, String(updates.assigneeId)))) {
        res.status(400).json({ error: 'Assignee must be a member of this project' })
        return
      }
    }

    if (updates.assigneeId === null || updates.assigneeId === '') {
      updates.assigneeId = undefined
    }

    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate as string)
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, organizationId: orgId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const projectIds = new Set<string>()
    projectIds.add(existing.projectId.toString())
    projectIds.add(task.projectId.toString())

    for (const pid of projectIds) {
      await syncProjectTaskCounts(pid)
    }
    await invalidateProjectCaches(orgId)

    const actorId = req.user!.userId
    const taskIdStr = task._id.toString()
    const projectIdStr = task.projectId.toString()

    if (updates.status && updates.status !== existing.status) {
      await logActivity({
        organizationId: orgId,
        projectId: projectIdStr,
        taskId: taskIdStr,
        actorId,
        type: 'status_changed',
        message: `changed status of "${task.title}" from ${existing.status} to ${task.status}`,
        metadata: { from: existing.status, to: task.status },
      })

      if (task.assigneeId && task.assigneeId.toString() !== actorId) {
        await createNotification({
          organizationId: orgId,
          userId: task.assigneeId.toString(),
          type: 'task',
          title: 'Task status updated',
          message: `"${task.title}" moved to ${task.status.replace('_', ' ')}`,
          projectId: projectIdStr,
          taskId: taskIdStr,
        })
      }
    }

    const prevAssignee = existing.assigneeId?.toString() ?? ''
    const nextAssignee = task.assigneeId?.toString() ?? ''
    if ('assigneeId' in updates && prevAssignee !== nextAssignee) {
      await logActivity({
        organizationId: orgId,
        projectId: projectIdStr,
        taskId: taskIdStr,
        actorId,
        type: 'task_assigned',
        message: nextAssignee
          ? `assigned task "${task.title}"`
          : `unassigned task "${task.title}"`,
        metadata: {
          assigneeId: nextAssignee,
          previousAssigneeId: prevAssignee,
        },
      })

      if (nextAssignee && nextAssignee !== actorId) {
        await createNotification({
          organizationId: orgId,
          userId: nextAssignee,
          type: 'task',
          title: 'Task assigned',
          message: `You were assigned to "${task.title}"`,
          projectId: projectIdStr,
          taskId: taskIdStr,
        })
      }
    }

    if (updates.priority && updates.priority !== existing.priority) {
      await logActivity({
        organizationId: orgId,
        projectId: projectIdStr,
        taskId: taskIdStr,
        actorId,
        type: 'task_priority_changed',
        message: `changed priority of "${task.title}" from ${existing.priority} to ${task.priority}`,
        metadata: { from: existing.priority, to: task.priority },
      })
    }

    const userMap = await buildUserMap(collectUserIds([task]))
    res.json(mapTask(task, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const taskId = paramId(req.params.id)

    const task = await Task.findOne({ _id: taskId, organizationId: orgId })
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const project = await requireProjectAccess(req, task.projectId.toString())
    if (!project) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    await deleteTaskAttachmentsByFilter({ organizationId: orgId, taskId })
    await Task.deleteOne({ _id: taskId, organizationId: orgId })

    await syncProjectTaskCounts(task.projectId.toString())
    await invalidateProjectCaches(orgId)

    res.json({ message: 'Task deleted' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
