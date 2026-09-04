import type { Response } from 'express'
import { Activity, type IActivity } from '../models/Activity'
import { Notification } from '../models/Notification'
import { Project } from '../models/Project'
import { Task } from '../models/Task'
import { User } from '../models/User'
import { cacheGet, cacheSet } from '../config/redis'
import type { AuthRequest } from '../middleware/auth'
import type { MembershipRole } from '../models/Membership'
import {
  buildAccessibleProjectsFilter,
  canViewAllProjects,
  getAccessibleProjectIds,
} from '../services/projectAccessService'

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

function buildActivityVisibilityFilter(
  orgId: string,
  accessibleProjectIds: string[] | null
): Record<string, unknown> {
  if (accessibleProjectIds === null) {
    return { organizationId: orgId }
  }

  return {
    organizationId: orgId,
    $or: [
      { projectId: { $exists: false } },
      { projectId: null },
      ...(accessibleProjectIds.length > 0
        ? [{ projectId: { $in: accessibleProjectIds } }]
        : []),
    ],
  }
}

function calcProjectProgress(projectId: string, tasks: InstanceType<typeof Task>[]) {
  const projectTasks = tasks.filter((t) => t.projectId.toString() === projectId)
  if (projectTasks.length === 0) return 0
  const done = projectTasks.filter((t) => t.status === 'done').length
  return Math.round((done / projectTasks.length) * 100)
}

function formatChartLabel(dateKey: string, rangeDays: number) {
  const date = new Date(dateKey)
  if (rangeDays <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }
  if (rangeDays <= 30) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getMetadataValue(metadata: IActivity['metadata'], key: string) {
  if (!metadata) return undefined
  if (metadata instanceof Map) return metadata.get(key)
  return (metadata as Record<string, string>)[key]
}

function buildChartBuckets(rangeDays: number) {
  const buckets = new Map<string, { created: number; completed: number; updated: number }>()
  const now = new Date()

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { created: 0, completed: 0, updated: 0 })
  }

  return buckets
}

function buildActivityChart(activities: IActivity[], rangeDays: number) {
  const buckets = buildChartBuckets(rangeDays)

  for (const activity of activities) {
    const key = activity.createdAt.toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue

    if (activity.type === 'task_created' || activity.type === 'project_created') {
      bucket.created++
    }

    if (
      activity.type === 'status_changed' &&
      getMetadataValue(activity.metadata, 'to') === 'done'
    ) {
      bucket.completed++
    }

    if (
      [
        'project_updated',
        'status_changed',
        'task_priority_changed',
        'comment_added',
        'attachment_added',
        'attachment_removed',
        'task_assigned',
      ].includes(activity.type)
    ) {
      bucket.updated++
    }
  }

  return [...buckets.entries()].map(([date, counts]) => ({
    date,
    label: formatChartLabel(date, rangeDays),
    created: counts.created,
    completed: counts.completed,
    updated: counts.updated,
  }))
}

function sparklineFromChart(
  chart: { created: number; completed: number; updated: number }[],
  key: 'created' | 'completed' | 'updated'
) {
  const slice = chart.slice(-7)
  if (slice.length === 0) return [0]
  return slice.map((d) => d[key])
}

function serializeUserSummary(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

function mapTask(t: InstanceType<typeof Task>) {
  return {
    id: t._id.toString(),
    projectId: t.projectId.toString(),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId?.toString(),
    dueDate: t.dueDate?.toISOString(),
    labels: t.labels,
    commentCount: t.commentCount,
    attachmentCount: t.attachmentCount,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

function mapActivity(
  a: IActivity,
  userMap: Map<string, InstanceType<typeof User>>
) {
  const actorId = a.actorId.toString()
  const actor = userMap.get(actorId)

  return {
    id: a._id.toString(),
    organizationId: a.organizationId.toString(),
    projectId: a.projectId?.toString(),
    taskId: a.taskId?.toString(),
    type: a.type,
    actorId,
    actor: actor ? serializeUserSummary(actor) : null,
    message: a.message,
    metadata: a.metadata instanceof Map ? Object.fromEntries(a.metadata.entries()) : a.metadata,
    createdAt: a.createdAt.toISOString(),
  }
}

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId
    const role = getRole(req)
    const now = new Date()
    const cacheKey = `dashboard:${orgId}`

    const cached = await cacheGet<unknown>(cacheKey)
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[cache] dashboard hit')
      }
      res.json(cached)
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[cache] dashboard miss')
    }

    const chartStart = new Date(now)
    chartStart.setDate(chartStart.getDate() - 90)

    const projectFilter = await buildAccessibleProjectsFilter(orgId, userId, role)
    const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, role)

    const taskFilter: Record<string, unknown> = { organizationId: orgId }
    if (!canViewAllProjects(role)) {
      taskFilter.assigneeId = userId
      if (accessibleProjectIds !== null) {
        taskFilter.projectId =
          accessibleProjectIds.length > 0 ? { $in: accessibleProjectIds } : { $in: [] }
      }
    }

    const activityFilter = {
      ...buildActivityVisibilityFilter(orgId, accessibleProjectIds),
      createdAt: { $gte: chartStart },
    }

    const [projects, tasks, activities, unreadNotificationCount] = await Promise.all([
      Project.find(projectFilter).sort({ updatedAt: -1 }),
      Task.find(taskFilter),
      Activity.find(activityFilter),
      Notification.countDocuments({ userId, organizationId: orgId, isRead: false }),
    ])

    const totalProjects = projects.length
    const activeProjects = projects.filter((p) => p.status === 'active').length
    const completedProjects = projects.filter((p) => p.status === 'completed').length
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'done').length
    const inProgressTasks = tasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'in_review'
    ).length
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== 'done'
    ).length

    const projectProgressList = projects.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      status: p.status,
      progress: p.status === 'completed' ? 100 : calcProjectProgress(p._id.toString(), tasks),
      updatedAt: p.updatedAt.toISOString(),
    }))

    const overallProjectProgress =
      projectProgressList.length > 0
        ? Math.round(
            projectProgressList.reduce((sum, p) => sum + p.progress, 0) / projectProgressList.length
          )
        : 0

    const recentProjects = projects.slice(0, 5).map((p) => ({
      id: p._id.toString(),
      name: p.name,
      status: p.status,
      progress: p.status === 'completed' ? 100 : calcProjectProgress(p._id.toString(), tasks),
      updatedAt: p.updatedAt.toISOString(),
    }))

    const myTasks = tasks
      .filter((t) => t.assigneeId?.toString() === userId && t.status !== 'done')
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return b.updatedAt.getTime() - a.updatedAt.getTime()
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.getTime() - b.dueDate.getTime()
      })
      .slice(0, 10)
      .map(mapTask)

    const recentActivityDocs = await Activity.find(buildActivityVisibilityFilter(orgId, accessibleProjectIds))
      .sort({ createdAt: -1 })
      .limit(10)

    const actorIds = recentActivityDocs.map((a) => a.actorId.toString())
    const actors = await User.find({ _id: { $in: actorIds } })
    const userMap = new Map(actors.map((u) => [u._id.toString(), u]))

    const recentActivities = recentActivityDocs.map((a) => mapActivity(a, userMap))

    const activityChart7D = buildActivityChart(activities, 7)
    const activityChart30D = buildActivityChart(activities, 30)
    const activityChart90D = buildActivityChart(activities, 90)

    const kpis = [
      {
        label: 'Project Progress',
        value: `${overallProjectProgress}%`,
        trendLabel:
          overallProjectProgress >= 100
            ? 'On track'
            : `${activeProjects} active project${activeProjects === 1 ? '' : 's'}`,
        sparkline: sparklineFromChart(activityChart30D, 'completed'),
        variant: 'yellow' as const,
      },
      {
        label: 'Completed Projects',
        value: `${completedProjects} / ${totalProjects}`,
        trendLabel:
          totalProjects > 0 && completedProjects === totalProjects
            ? 'All projects complete'
            : `${totalProjects - completedProjects} remaining`,
        sparkline: sparklineFromChart(activityChart30D, 'completed'),
        variant: 'green' as const,
      },
      {
        label: 'Total Tasks',
        value: String(totalTasks),
        trendLabel:
          totalTasks === 0
            ? 'No tasks yet'
            : `${completedTasks} of ${totalTasks} completed`,
        sparkline: sparklineFromChart(activityChart30D, 'created'),
        variant: 'orange' as const,
      },
      {
        label: 'Active Tasks',
        value: String(inProgressTasks),
        trendLabel:
          inProgressTasks === 0
            ? totalTasks > 0 && completedTasks === totalTasks
              ? 'All complete'
              : 'No active work'
            : `${inProgressTasks} in progress`,
        sparkline: sparklineFromChart(activityChart30D, 'updated'),
        variant: 'blue' as const,
      },
    ]

    const dashboardData = {
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      overallProjectProgress,
      recentProjects,
      projectProgressList,
      myTasks,
      recentActivities,
      unreadNotificationCount,
      activityChart: {
        '7D': activityChart7D,
        '30D': activityChart30D,
        '90D': activityChart90D,
      },
      kpis,
    }

    await cacheSet(cacheKey, dashboardData, 300)
    res.json(dashboardData)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// Keep legacy endpoint for compatibility
export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  return getDashboard(req, res)
}
