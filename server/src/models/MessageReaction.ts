import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IMessageReaction extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  messageId: Types.ObjectId
  userId: Types.ObjectId
  emoji: string
  createdAt: Date
  updatedAt: Date
}

const messageReactionSchema = new Schema<IMessageReaction>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

messageReactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true })
messageReactionSchema.index({ organizationId: 1, messageId: 1 })

export const MessageReaction = mongoose.model<IMessageReaction>(
  'MessageReaction',
  messageReactionSchema
)
