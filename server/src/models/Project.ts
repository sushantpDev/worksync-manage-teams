import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export interface IProject extends Document {
  _id: Types.ObjectId
  name: string
  description: string
  organizationId: Types.ObjectId
  ownerId: Types.ObjectId
  teamIds: Types.ObjectId[]
  status: ProjectStatus
  progress: number
  startDate: Date
  dueDate: Date
  taskCount: number
  completedTaskCount: number
  memberIds: Types.ObjectId[]
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
      default: 'planning',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    taskCount: { type: Number, default: 0 },
    completedTaskCount: { type: Number, default: 0 },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

projectSchema.index({ organizationId: 1, status: 1 })
projectSchema.index({ organizationId: 1, updatedAt: -1 })

export const Project = mongoose.model<IProject>('Project', projectSchema)
