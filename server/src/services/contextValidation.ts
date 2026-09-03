import type { AuthRequest } from '../middleware/auth'
import type { MembershipRole } from '../models/Membership'
import type { IProject } from '../models/Project'
import { Project } from '../models/Project'
import { Task } from '../models/Task'
import { canAccessProject } from './projectAccessService'

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

export function canMutateComments(req: AuthRequest): boolean {
  const role = getRole(req)
  return role !== 'viewer'
}

export async function getProjectInOrg(orgId: string, projectId: string) {
  return Project.findOne({ _id: projectId, organizationId: orgId })
}

export async function getAccessibleProjectInOrg(
  req: AuthRequest,
  projectId: string
): Promise<IProject | null> {
  const orgId = req.organizationId ?? req.user!.organizationId
  const project = await getProjectInOrg(orgId, projectId)

  if (!project) {
    return null
  }

  const hasAccess = await canAccessProject({
    project,
    userId: req.user!.userId,
    role: getRole(req),
    organizationId: orgId,
  })

  return hasAccess ? project : null
}

export async function getTaskInOrg(orgId: string, taskId: string, projectId?: string) {
  const filter: Record<string, unknown> = { _id: taskId, organizationId: orgId }
  if (projectId) filter.projectId = projectId
  return Task.findOne(filter)
}

export async function getAccessibleTaskInOrg(
  req: AuthRequest,
  taskId: string,
  projectId: string
) {
  const orgId = req.organizationId ?? req.user!.organizationId
  const project = await getAccessibleProjectInOrg(req, projectId)
  if (!project) {
    return null
  }

  const task = await getTaskInOrg(orgId, taskId, projectId)
  if (!task) {
    return null
  }

  const role = getRole(req)
  if (role !== 'admin' && role !== 'manager') {
    if (task.assigneeId?.toString() !== req.user!.userId) {
      return null
    }
  }

  return task
}
