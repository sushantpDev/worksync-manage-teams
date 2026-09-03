import type { Response } from 'express'
import { Comment } from '../models/Comment'
import { Task } from '../models/Task'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import {
  canMutateComments,
  getAccessibleProjectInOrg,
  getAccessibleTaskInOrg,
} from '../services/contextValidation'
import { logActivity } from '../services/activityService'
import { notifyUsers } from '../services/notificationService'

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

function mapComment(
  c: InstanceType<typeof Comment>,
  userMap: Map<string, InstanceType<typeof User>>
) {
  const authorId = c.authorId.toString()
  const author = userMap.get(authorId)

  return {
    id: c._id.toString(),
    organizationId: c.organizationId.toString(),
    projectId: c.projectId.toString(),
    taskId: c.taskId?.toString(),
    authorId,
    userId: authorId,
    author: author ? serializeUserSummary(author) : null,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export async function listComments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const projectId = req.query.projectId as string | undefined
    const taskId = req.query.taskId as string | undefined

    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' })
      return
    }

    const project = await getAccessibleProjectInOrg(req, projectId)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const filter: Record<string, unknown> = {
      organizationId: orgId,
      projectId,
    }

    if (taskId) {
      const task = await getAccessibleTaskInOrg(req, taskId, projectId)
      if (!task) {
        res.status(404).json({ error: 'Task not found' })
        return
      }
      filter.taskId = taskId
    } else {
      filter.$or = [{ taskId: { $exists: false } }, { taskId: null }]
    }

    const comments = await Comment.find(filter).sort({ createdAt: -1 }).limit(200)
    const userMap = await buildUserMap(comments.map((c) => c.authorId.toString()))
    res.json(comments.map((c) => mapComment(c, userMap)))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const commentId = paramId(req.params.id)

    const comment = await Comment.findOne({ _id: commentId, organizationId: orgId })
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    const project = await getAccessibleProjectInOrg(req, comment.projectId.toString())
    if (!project) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    if (comment.taskId) {
      const task = await getAccessibleTaskInOrg(
        req,
        comment.taskId.toString(),
        comment.projectId.toString()
      )
      if (!task) {
        res.status(404).json({ error: 'Comment not found' })
        return
      }
    }

    const userMap = await buildUserMap([comment.authorId.toString()])
    res.json(mapComment(comment, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const { projectId, taskId, content } = req.body
    const authorId = req.user!.userId

    if (!canMutateComments(req)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    if (!projectId || !content?.trim()) {
      res.status(400).json({ error: 'Project ID and content are required' })
      return
    }

    const project = await getAccessibleProjectInOrg(req, String(projectId))
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    let relatedTask: InstanceType<typeof Task> | null = null
    if (taskId) {
      relatedTask = await getAccessibleTaskInOrg(req, String(taskId), String(projectId))
      if (!relatedTask) {
        res.status(404).json({ error: 'Task not found' })
        return
      }
    }

    const comment = await Comment.create({
      organizationId: orgId,
      projectId,
      taskId: taskId || undefined,
      authorId,
      content: content.trim(),
    })

    if (taskId) {
      await Task.findByIdAndUpdate(taskId, { $inc: { commentCount: 1 } })
    }

    await logActivity({
      organizationId: orgId,
      projectId: String(projectId),
      taskId: taskId ? String(taskId) : undefined,
      actorId: authorId,
      type: 'comment_added',
      message: taskId ? 'added a comment on a task' : 'added a comment on the project',
      metadata: { commentId: comment._id.toString() },
    })

    const recipientIds = new Set<string>()
    const ownerId = project.ownerId.toString()
    if (ownerId !== authorId) recipientIds.add(ownerId)

    if (relatedTask?.assigneeId) {
      const assigneeId = relatedTask.assigneeId.toString()
      if (assigneeId !== authorId) recipientIds.add(assigneeId)
    }

    const commentTitle = relatedTask
      ? `New comment on "${relatedTask.title}"`
      : `New comment on "${project.name}"`
    const commentMessage = relatedTask
      ? `Someone commented on task "${relatedTask.title}"`
      : `Someone commented on project "${project.name}"`

    await notifyUsers([...recipientIds], {
      organizationId: orgId,
      type: 'message',
      title: commentTitle,
      message: commentMessage,
      projectId: String(projectId),
      taskId: taskId ? String(taskId) : undefined,
    })

    const userMap = await buildUserMap([authorId])
    res.status(201).json(mapComment(comment, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const commentId = paramId(req.params.id)
    const { content } = req.body

    if (!canMutateComments(req)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    if (!content?.trim()) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const comment = await Comment.findOne({ _id: commentId, organizationId: orgId })
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    const project = await getAccessibleProjectInOrg(req, comment.projectId.toString())
    if (!project) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    if (comment.taskId) {
      const task = await getAccessibleTaskInOrg(
        req,
        comment.taskId.toString(),
        comment.projectId.toString()
      )
      if (!task) {
        res.status(404).json({ error: 'Comment not found' })
        return
      }
    }

    if (comment.authorId.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'You can only edit your own comments' })
      return
    }

    comment.content = content.trim()
    await comment.save()

    const userMap = await buildUserMap([comment.authorId.toString()])
    res.json(mapComment(comment, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const commentId = paramId(req.params.id)
    const role = req.membership?.role ?? req.user!.role

    if (role === 'viewer') {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const comment = await Comment.findOne({ _id: commentId, organizationId: orgId })
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    const project = await getAccessibleProjectInOrg(req, comment.projectId.toString())
    if (!project) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    if (comment.taskId) {
      const task = await getAccessibleTaskInOrg(
        req,
        comment.taskId.toString(),
        comment.projectId.toString()
      )
      if (!task) {
        res.status(404).json({ error: 'Comment not found' })
        return
      }
    }

    const isAuthor = comment.authorId.toString() === req.user!.userId
    const isAdmin = role === 'admin'

    if (!isAuthor && !isAdmin) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    await Comment.deleteOne({ _id: commentId })

    if (comment.taskId) {
      await Task.findOneAndUpdate(
        { _id: comment.taskId, commentCount: { $gt: 0 } },
        { $inc: { commentCount: -1 } }
      )
    }

    res.json({ message: 'Comment deleted' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
