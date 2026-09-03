import mongoose from 'mongoose'
import { Activity } from '../models/Activity'
import { Comment } from '../models/Comment'
import { Notification } from '../models/Notification'
import { Project } from '../models/Project'
import { Task } from '../models/Task'
import { deleteTaskAttachmentsByFilter } from '../services/taskAttachmentService'

/**
 * Permanently removes a project and all project-scoped records.
 * Org-level activities without projectId are preserved.
 */
export async function deleteProjectAndRelatedData(
  orgId: string,
  projectId: string
): Promise<boolean> {
  const projectObjectId = new mongoose.Types.ObjectId(projectId)

  const project = await Project.findOne({ _id: projectObjectId, organizationId: orgId })
  if (!project) {
    return false
  }

  const taskIds = await Task.find({ projectId: projectObjectId, organizationId: orgId }).distinct(
    '_id'
  )

  await Promise.all([
    Notification.deleteMany({
      organizationId: orgId,
      $or: [{ projectId: projectObjectId }, { taskId: { $in: taskIds } }],
    }),
    deleteTaskAttachmentsByFilter({ organizationId: orgId, projectId }),
    Task.deleteMany({ projectId: projectObjectId, organizationId: orgId }),
    Comment.deleteMany({ projectId: projectObjectId, organizationId: orgId }),
    Activity.deleteMany({ projectId: projectObjectId, organizationId: orgId }),
  ])

  const result = await Project.deleteOne({ _id: projectObjectId, organizationId: orgId })
  return result.deletedCount > 0
}
