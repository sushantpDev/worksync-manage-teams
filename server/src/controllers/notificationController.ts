import type { Response } from 'express'
import { Notification } from '../models/Notification'
import type { AuthRequest } from '../middleware/auth'

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function mapNotification(n: InstanceType<typeof Notification>) {
  return {
    id: n._id.toString(),
    organizationId: n.organizationId.toString(),
    userId: n.userId.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    projectId: n.projectId?.toString(),
    taskId: n.taskId?.toString(),
    communicationContextType: n.communicationContextType,
    channelId: n.channelId?.toString(),
    conversationId: n.conversationId?.toString(),
    messageId: n.messageId?.toString(),
    teamId: n.teamId?.toString(),
    isRead: n.isRead,
    read: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }
}

export async function listNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId

    const notifications = await Notification.find({
      userId,
      organizationId: orgId,
    })
      .sort({ createdAt: -1 })
      .limit(100)

    const unreadCount = notifications.filter((n) => !n.isRead).length

    res.json({
      notifications: notifications.map(mapNotification),
      unreadCount,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId
    const notificationId = paramId(req.params.id)

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId, organizationId: orgId },
      { $set: { isRead: true } },
      { new: true }
    )

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }

    res.json(mapNotification(notification))
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId

    const result = await Notification.updateMany(
      { userId, organizationId: orgId, isRead: false },
      { $set: { isRead: true } }
    )

    res.json({ message: 'All notifications marked as read', updatedCount: result.modifiedCount })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
