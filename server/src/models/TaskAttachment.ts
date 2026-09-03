import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ITaskAttachment extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  projectId: Types.ObjectId
  taskId: Types.ObjectId
  uploadedBy: Types.ObjectId
  fileName: string
  fileUrl: string
  publicId: string
  resourceType: 'image' | 'raw'
  mimeType: string
  size: number
  createdAt: Date
  updatedAt: Date
}

const taskAttachmentSchema = new Schema<ITaskAttachment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'raw'], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

taskAttachmentSchema.index({ organizationId: 1, taskId: 1, createdAt: -1 })
taskAttachmentSchema.index({ organizationId: 1, projectId: 1 })

export const TaskAttachment = mongoose.model<ITaskAttachment>('TaskAttachment', taskAttachmentSchema)
