import type { Response } from 'express'
import crypto from 'crypto'
import { Task } from '../models/Task'
import { TaskAttachment } from '../models/TaskAttachment'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import type { MembershipRole } from '../models/Membership'
import {
  canMutateComments,
  getAccessibleTaskInOrg,
} from '../services/contextValidation'
import { logActivity } from '../services/activityService'
import { isCloudinaryConfigured } from '../config/cloudinary'
import {
  deleteTaskAttachmentFile,
  sanitizeAttachmentFileName,
  uploadTaskAttachmentFile,
  validateTaskAttachmentFile,
} from '../services/taskAttachmentService'

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

function canDeleteAttachment(
  req: AuthRequest,
  uploadedBy: string
): boolean {
  const role = getRole(req)
  if (role === 'viewer') return false
  if (role === 'admin' || role === 'manager') return true
  return uploadedBy === req.user!.userId
}

async function buildUserMap(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map<string, InstanceType<typeof User>>()
  const users = await User.find({ _id: { $in: uniqueIds } })
  return new Map(users.map((u) => [u._id.toString(), u]))
}

function serializeUserSummary(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

function mapAttachment(
  attachment: InstanceType<typeof TaskAttachment>,
  userMap: Map<string, InstanceType<typeof User>>
) {
  const uploaderId = attachment.uploadedBy.toString()
  const uploader = userMap.get(uploaderId)

  return {
    id: attachment._id.toString(),
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    mimeType: attachment.mimeType,
    size: attachment.size,
    uploadedBy: uploader ? serializeUserSummary(uploader) : null,
    createdAt: attachment.createdAt.toISOString(),
  }
}

async function resolveTask(req: AuthRequest, taskId: string) {
  const orgId = req.organizationId ?? req.user!.organizationId
  const task = await Task.findOne({ _id: taskId, organizationId: orgId })
  if (!task) return null
  return getAccessibleTaskInOrg(req, taskId, task.projectId.toString())
}

export async function listTaskAttachments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const taskId = paramId(req.params.taskId)
    const task = await resolveTask(req, taskId)
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const orgId = req.organizationId ?? req.user!.organizationId
    const attachments = await TaskAttachment.find({ organizationId: orgId, taskId })
      .sort({ createdAt: -1 })
      .limit(100)

    const userMap = await buildUserMap(attachments.map((a) => a.uploadedBy.toString()))
    res.json(attachments.map((a) => mapAttachment(a, userMap)))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function uploadTaskAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!isCloudinaryConfigured()) {
      res.status(503).json({ error: 'File upload is not configured' })
      return
    }

    if (!canMutateComments(req)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const taskId = paramId(req.params.taskId)
    const task = await resolveTask(req, taskId)
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    const validationError = validateTaskAttachmentFile(file.mimetype, file.size)
    if (validationError) {
      res.status(400).json({ error: validationError })
      return
    }

    const orgId = req.organizationId ?? req.user!.organizationId
    const uploaderId = req.user!.userId
    const attachmentId = crypto.randomBytes(16).toString('hex')
    const fileName = sanitizeAttachmentFileName(file.originalname)

    const uploadResult = await uploadTaskAttachmentFile({
      orgId,
      taskId,
      attachmentId,
      buffer: file.buffer,
      mimetype: file.mimetype,
    })

    const attachment = await TaskAttachment.create({
      organizationId: orgId,
      projectId: task.projectId,
      taskId: task._id,
      uploadedBy: uploaderId,
      fileName,
      fileUrl: uploadResult.fileUrl,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
      mimeType: file.mimetype,
      size: file.size,
    })

    await Task.findByIdAndUpdate(taskId, { $inc: { attachmentCount: 1 } })

    await logActivity({
      organizationId: orgId,
      projectId: task.projectId.toString(),
      taskId,
      actorId: uploaderId,
      type: 'attachment_added',
      message: `added attachment "${fileName}" to "${task.title}"`,
      metadata: {
        attachmentId: attachment._id.toString(),
        fileName,
      },
    })

    const userMap = await buildUserMap([uploaderId])
    res.status(201).json(mapAttachment(attachment, userMap))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteTaskAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const taskId = paramId(req.params.taskId)
    const attachmentId = paramId(req.params.attachmentId)
    const orgId = req.organizationId ?? req.user!.organizationId

    const task = await resolveTask(req, taskId)
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const attachment = await TaskAttachment.findOne({
      _id: attachmentId,
      organizationId: orgId,
      taskId,
    })

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' })
      return
    }

    if (!canDeleteAttachment(req, attachment.uploadedBy.toString())) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    try {
      await deleteTaskAttachmentFile(attachment)
    } catch (error) {
      console.error(
        '[attachments] Cloudinary delete failed:',
        attachment.publicId,
        (error as Error).message
      )
      res.status(500).json({ error: 'Unable to delete attachment file' })
      return
    }

    await TaskAttachment.deleteOne({ _id: attachmentId })
    await Task.findOneAndUpdate(
      { _id: taskId, attachmentCount: { $gt: 0 } },
      { $inc: { attachmentCount: -1 } }
    )

    await logActivity({
      organizationId: orgId,
      projectId: task.projectId.toString(),
      taskId,
      actorId: req.user!.userId,
      type: 'attachment_removed',
      message: `removed attachment "${attachment.fileName}" from "${task.title}"`,
      metadata: {
        attachmentId,
        fileName: attachment.fileName,
      },
    })

    res.json({ message: 'Attachment deleted' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
