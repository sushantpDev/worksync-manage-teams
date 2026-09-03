import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IConversation extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  type: 'direct'
  participantIds: Types.ObjectId[]
  directKey: string
  lastMessageId?: Types.ObjectId
  lastMessageAt?: Date
  createdAt: Date
  updatedAt: Date
}

const conversationSchema = new Schema<IConversation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, enum: ['direct'], default: 'direct', required: true },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    directKey: { type: String, required: true },
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
)

conversationSchema.index({ organizationId: 1, directKey: 1 }, { unique: true })
conversationSchema.index({ organizationId: 1, participantIds: 1, lastMessageAt: -1 })

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema)
