import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IComment extends Document {
  _id: Types.ObjectId
  projectId: Types.ObjectId
  taskId?: Types.ObjectId
  organizationId: Types.ObjectId
  authorId: Types.ObjectId
  content: string
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<IComment>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
)

commentSchema.index({ projectId: 1, createdAt: -1 })

export const Comment = mongoose.model<IComment>('Comment', commentSchema)
