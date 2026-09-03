import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ICommunicationReadState extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  userId: Types.ObjectId
  contextType: 'channel' | 'direct'
  channelId?: Types.ObjectId
  conversationId?: Types.ObjectId
  lastReadMessageId?: Types.ObjectId
  lastReadAt: Date
  createdAt: Date
  updatedAt: Date
}

const readStateSchema = new Schema<ICommunicationReadState>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contextType: { type: String, enum: ['channel', 'direct'], required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    lastReadMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastReadAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
)

readStateSchema.index(
  { organizationId: 1, userId: 1, contextType: 1, channelId: 1 },
  { unique: true, partialFilterExpression: { contextType: 'channel' } }
)
readStateSchema.index(
  { organizationId: 1, userId: 1, contextType: 1, conversationId: 1 },
  { unique: true, partialFilterExpression: { contextType: 'direct' } }
)

export const CommunicationReadState = mongoose.model<ICommunicationReadState>(
  'CommunicationReadState',
  readStateSchema
)
