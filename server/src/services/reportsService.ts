import { Types } from 'mongoose'
import { Activity, type IActivity } from '../models/Activity'
import { Membership, type MembershipRole } from '../models/Membership'
import { Project, type IProject } from '../models/Project'
import { Task, type ITask } from '../models/Task'
import { User } from '../models/User'
import {
  buildAccessibleProjectsFilter,
  getAccessibleProjectIds,
} from './projectAccessService'

export type ReportRange = '7d' | '30d' | '90d'

const RANGE_DAYS: Record<ReportRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

const PROJECT_STATUS_SORT: Record<string, number> = {
  active: 0,
  planning: 1,
  on_hold: 2,
  completed: 3,
  archived: 4,
}

export function parseReportRange(value: unknown): ReportRange {
  const normalized = typeof value === 'string' ? value.toLowerCase() : ''
  if (normalized === '7d' || normalized === '30d' || normalized === '90d') {
    return normalized
  }
  return '30d'
}

function getMetadataValue(metadata: IActivity['metadata'], key: string) {
  if (!metadata) return undefined
  if (metadata instanceof Map) return metadata.get(key)
  return (metadata as Record<string, string>)[key]
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

export function isTaskOverdue(task: Pick<ITask, 'dueDate' | 'status'>, now: Date): boolean {
  return Boolean(task.dueDate && task.dueDate < now && task.status !== 'done')
}

export function calcProjectProgress(
  projectId: string,
  tasks: Pick<ITask, 'projectId' | 'status'>[]
): number {
  const projectTasks = tasks.filter((t) => t.projectId.toString() === projectId)
  if (projectTasks.length === 0) return 0
  const done = projectTasks.filter((t) => t.status === 'done').length
  return Math.round((done / projectTasks.length) * 100)
}

function formatTrendLabel(dateKey: string, rangeDays: number) {
  const date = new Date(dateKey)
  if (rangeDays <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekStartKey(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

function buildDailyCompletionTrend(activities: IActivity[], rangeDays: number) {
  const buckets = new Map<string, number>()
  const now = new Date()

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }

  for (const activity of activities) {
    if (getMetadataValue(activity.metadata, 'to') !== 'done') continue
    const key = activity.createdAt.toISOString().slice(0, 10)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({
    date,
    label: formatTrendLabel(date, rangeDays),
    count,
  }))
}

function buildWeeklyCompletionTrend(activities: IActivity[], rangeDays: number) {
  const buckets = new Map<string, number>()
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const rangeStart = new Date(now)
  rangeStart.setDate(rangeStart.getDate() - rangeDays + 1)

  let weekStart = new Date(rangeStart)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  while (weekStart <= now) {
    buckets.set(weekStart.toISOString().slice(0, 10), 0)
    weekStart = new Date(weekStart)
    weekStart.setDate(weekStart.getDate() + 7)
  }

  for (const activity of activities) {
    if (getMetadataValue(activity.metadata, 'to') !== 'done') continue
    const key = getWeekStartKey(activity.createdAt)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({
    date,
    label: formatTrendLabel(date, rangeDays),
    count,
  }))
}

function buildCompletionTrend(activities: IActivity[], rangeDays: number) {
  if (rangeDays >= 90) {
    return buildWeeklyCompletionTrend(activities, rangeDays)
  }
  return buildDailyCompletionTrend(activities, rangeDays)
}

function sortProjectPerformance<T extends { status: string; overdueTasks: number; name: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    if (b.overdueTasks !== a.overdueTasks) {
      return b.overdueTasks - a.overdueTasks
    }

    const statusDiff =
      (PROJECT_STATUS_SORT[a.status] ?? 99) - (PROJECT_STATUS_SORT[b.status] ?? 99)
    if (statusDiff !== 0) return statusDiff

    return a.name.localeCompare(b.name)
  })
}

export async function buildOrganizationReport(params: {
  organizationId: string
  userId: string
  role: MembershipRole
  range: ReportRange
}) {
  const { organizationId: orgId, userId, role, range } = params
  const rangeDays = RANGE_DAYS[range]
  const now = new Date()

  const rangeStart = new Date(now)
  rangeStart.setHours(0, 0, 0, 0)
  rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1))

  const projectFilter = await buildAccessibleProjectsFilter(orgId, userId, role)
  const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, role)

  const [projects, memberships] = await Promise.all([
    Project.find(projectFilter).select('name status dueDate').lean<IProject[]>(),
    Membership.find({ organizationId: orgId }).lean(),
  ])

  const projectIds = projects.map((p) => p._id.toString())
  const projectObjectIds = projectIds.map((id) => new Types.ObjectId(id))

  const taskFilter =
    projectIds.length > 0
      ? {
          organizationId: new Types.ObjectId(orgId),
          projectId: { $in: projectObjectIds },
        }
      : null

  const activityFilter = {
    ...buildActivityVisibilityFilter(orgId, accessibleProjectIds),
    createdAt: { $gte: rangeStart },
    type: 'status_changed',
  }

  const [tasks, activities, users] = await Promise.all([
    taskFilter
      ? Task.find(taskFilter)
          .select('projectId status priority assigneeId dueDate')
          .lean<ITask[]>()
      : Promise.resolve([] as ITask[]),
    Activity.find(activityFilter).select('metadata createdAt').lean<IActivity[]>(),
    memberships.length > 0
      ? User.find({
          _id: { $in: memberships.map((m) => m.userId) },
        })
          .select('firstName lastName email avatarUrl')
          .lean()
      : Promise.resolve([]),
  ])

  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === 'active').length
  const completedProjects = projects.filter((p) => p.status === 'completed').length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'done').length
  const inProgressTasks = tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'in_review'
  ).length
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t, now)).length
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const statusCounts = new Map<string, number>(
    TASK_STATUSES.map((status) => [status, 0])
  )
  const priorityCounts = new Map<string, number>(
    TASK_PRIORITIES.map((priority) => [priority, 0])
  )

  for (const task of tasks) {
    statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1)
    priorityCounts.set(task.priority, (priorityCounts.get(task.priority) ?? 0) + 1)
  }

  const projectPerformance = sortProjectPerformance(
    projects.map((project) => {
      const projectId = project._id.toString()
      const projectTasks = tasks.filter((t) => t.projectId.toString() === projectId)
      const projectCompleted = projectTasks.filter((t) => t.status === 'done').length
      const projectInProgress = projectTasks.filter(
        (t) => t.status === 'in_progress' || t.status === 'in_review'
      ).length
      const projectOverdue = projectTasks.filter((t) => isTaskOverdue(t, now)).length

      return {
        projectId,
        name: project.name,
        status: project.status,
        progress:
          project.status === 'completed' ? 100 : calcProjectProgress(projectId, tasks),
        totalTasks: projectTasks.length,
        completedTasks: projectCompleted,
        inProgressTasks: projectInProgress,
        overdueTasks: projectOverdue,
        dueDate: project.dueDate?.toISOString() ?? null,
      }
    })
  )

  const userMap = new Map(users.map((u) => [u._id.toString(), u]))
  const workloadByUser = new Map<
    string,
    {
      assignedTasks: number
      inProgress: number
      inReview: number
      completed: number
      overdue: number
    }
  >()

  for (const membership of memberships) {
    workloadByUser.set(membership.userId.toString(), {
      assignedTasks: 0,
      inProgress: 0,
      inReview: 0,
      completed: 0,
      overdue: 0,
    })
  }

  for (const task of tasks) {
    const assigneeId = task.assigneeId?.toString()
    if (!assigneeId) continue

    const entry = workloadByUser.get(assigneeId)
    if (!entry) continue

    entry.assignedTasks++
    if (task.status === 'in_progress') entry.inProgress++
    if (task.status === 'in_review') entry.inReview++
    if (task.status === 'done') entry.completed++
    if (isTaskOverdue(task, now)) entry.overdue++
  }

  const teamWorkload = memberships
    .map((membership) => {
      const userIdKey = membership.userId.toString()
      const user = userMap.get(userIdKey)
      const counts = workloadByUser.get(userIdKey) ?? {
        assignedTasks: 0,
        inProgress: 0,
        inReview: 0,
        completed: 0,
        overdue: 0,
      }

      return {
        userId: userIdKey,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown member',
        email: user?.email ?? '',
        avatarUrl: user?.avatarUrl ?? null,
        role: membership.role,
        ...counts,
      }
    })
    .sort((a, b) => {
      if (b.assignedTasks !== a.assignedTasks) {
        return b.assignedTasks - a.assignedTasks
      }
      return a.name.localeCompare(b.name)
    })

  return {
    range,
    overview: {
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate,
    },
    projectPerformance,
    tasksByStatus: TASK_STATUSES.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    tasksByPriority: TASK_PRIORITIES.map((priority) => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    })),
    completionTrend: buildCompletionTrend(activities, rangeDays),
    teamWorkload,
  }
}
