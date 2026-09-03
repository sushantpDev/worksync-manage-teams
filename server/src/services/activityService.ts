import { Activity, type ActivityType } from '../models/Activity'

export interface LogActivityInput {
  organizationId: string
  projectId?: string
  taskId?: string
  actorId: string
  type: ActivityType
  message: string
  metadata?: Record<string, string>
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await Activity.create({
      organizationId: input.organizationId,
      projectId: input.projectId,
      taskId: input.taskId,
      actorId: input.actorId,
      type: input.type,
      message: input.message,
      metadata: input.metadata,
    })
  } catch (error) {
    console.warn('Failed to log activity:', (error as Error).message)
  }
}
