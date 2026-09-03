import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type NotificationType = 'message' | 'task' | 'project' | 'system' | 'communication_mention'

export interface INotification extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  organizationId: Types.ObjectId
  type: NotificationType
  title: string
  message: string
  projectId?: Types.ObjectId
  taskId?: Types.ObjectId
  communicationContextType?: 'channel' | 'direct'
  channelId?: Types.ObjectId
  conversationId?: Types.ObjectId
  messageId?: Types.ObjectId
  teamId?: Types.ObjectId
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: {
      type: String,
      enum: ['message', 'task', 'project', 'system', 'communication_mention'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    communicationContextType: { type: String, enum: ['channel', 'direct'] },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, organizationId: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, organizationId: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)
