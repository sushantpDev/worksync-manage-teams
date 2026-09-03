import type { Response } from 'express'
import { Activity } from '../models/Activity'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import type { MembershipRole } from '../models/Membership'
import { getAccessibleProjectInOrg } from '../services/contextValidation'
import { getAccessibleProjectIds } from '../services/projectAccessService'

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

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

function mapMetadata(metadata?: Map<string, string> | Record<string, string>) {
  if (!metadata) return undefined
  if (metadata instanceof Map) {
    return Object.fromEntries(metadata.entries())
  }
  return metadata
}

function mapActivity(
  a: InstanceType<typeof Activity>,
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
    metadata: mapMetadata(a.metadata),
    createdAt: a.createdAt.toISOString(),
  }
}

export async function listActivities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId
    const role = getRole(req)
    const projectId = req.query.projectId as string | undefined

    const filter: Record<string, unknown> = { organizationId: orgId }

    if (projectId) {
      const project = await getAccessibleProjectInOrg(req, projectId)
      if (!project) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      filter.projectId = projectId
    } else {
      const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, role)
      if (accessibleProjectIds !== null) {
        filter.$or = [
          { projectId: { $exists: false } },
          { projectId: null },
          ...(accessibleProjectIds.length > 0
            ? [{ projectId: { $in: accessibleProjectIds } }]
            : []),
        ]
      }
    }

    const activities = await Activity.find(filter).sort({ createdAt: -1 }).limit(100)
    const userMap = await buildUserMap(activities.map((a) => a.actorId.toString()))
    res.json(activities.map((a) => mapActivity(a, userMap)))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const activityId = paramId(req.params.id)

    const activity = await Activity.findOne({ _id: activityId, organizationId: orgId })
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' })
      return
    }

    if (activity.projectId) {
      const project = await getAccessibleProjectInOrg(req, activity.projectId.toString())
      if (!project) {
        res.status(404).json({ error: 'Activity not found' })
        return
      }
    }

    const userMap = await buildUserMap([activity.actorId.toString()])
    res.json(mapActivity(activity, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
