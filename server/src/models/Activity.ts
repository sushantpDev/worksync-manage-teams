import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'task_created'
  | 'task_assigned'
  | 'status_changed'
  | 'task_priority_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'
  | 'member_added'
  | 'member_role_changed'
  | 'member_removed'

export interface IActivity extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  projectId?: Types.ObjectId
  taskId?: Types.ObjectId
  type: ActivityType
  actorId: Types.ObjectId
  message: string
  metadata?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

const activitySchema = new Schema<IActivity>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    type: {
      type: String,
      enum: [
        'project_created',
        'project_updated',
        'task_created',
        'task_assigned',
        'status_changed',
        'task_priority_changed',
        'comment_added',
        'attachment_added',
        'attachment_removed',
        'member_added',
        'member_role_changed',
        'member_removed',
      ],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    metadata: { type: Map, of: String },
  },
  { timestamps: true }
)

activitySchema.index({ organizationId: 1, projectId: 1, createdAt: -1 })
activitySchema.index({ organizationId: 1, createdAt: -1 })

export const Activity = mongoose.model<IActivity>('Activity', activitySchema)
