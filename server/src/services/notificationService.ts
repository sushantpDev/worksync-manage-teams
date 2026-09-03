import { Notification, type NotificationType } from '../models/Notification'

export interface CreateNotificationInput {
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  message: string
  projectId?: string
  taskId?: string
  communicationContextType?: 'channel' | 'direct'
  channelId?: string
  conversationId?: string
  messageId?: string
  teamId?: string
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await Notification.create({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      projectId: input.projectId,
      taskId: input.taskId,
      communicationContextType: input.communicationContextType,
      channelId: input.channelId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      teamId: input.teamId,
      isRead: false,
    })
  } catch (error) {
    console.warn('Failed to create notification:', (error as Error).message)
  }
}

export async function notifyUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<void> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  for (const userId of uniqueIds) {
    await createNotification({ ...input, userId })
  }
}
