import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ITask extends Document {
  _id: Types.ObjectId
  projectId: Types.ObjectId
  organizationId: Types.ObjectId
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: Types.ObjectId
  dueDate?: Date
  labels: string[]
  commentCount: number
  attachmentCount: number
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const taskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    labels: [{ type: String }],
    commentCount: { type: Number, default: 0 },
    attachmentCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

taskSchema.index({ projectId: 1, status: 1 })
taskSchema.index({ organizationId: 1, assigneeId: 1 })
taskSchema.index({ organizationId: 1, dueDate: 1 })

export const Task = mongoose.model<ITask>('Task', taskSchema)
