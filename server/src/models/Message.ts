import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IMessageAttachment {
  _id: Types.ObjectId
  fileName: string
  fileUrl: string
  publicId: string
  resourceType: 'image' | 'raw'
  mimeType: string
  size: number
}

export interface IMessageMention {
  userId: Types.ObjectId
  displayName: string
  start: number
  end: number
}

export interface IMessage extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  contextType: 'channel' | 'direct'
  channelId?: Types.ObjectId
  conversationId?: Types.ObjectId
  senderId: Types.ObjectId
  content: string
  mentions: IMessageMention[]
  replyToMessageId?: Types.ObjectId
  attachments: IMessageAttachment[]
  editedAt?: Date
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const attachmentSchema = new Schema<IMessageAttachment>(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'raw'], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: true }
)

const messageSchema = new Schema<IMessage>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    contextType: { type: String, enum: ['channel', 'direct'], required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '', trim: true, maxlength: 5000 },
    mentions: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          displayName: { type: String, required: true, trim: true },
          start: { type: Number, required: true, min: 0 },
          end: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    replyToMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    attachments: { type: [attachmentSchema], default: [] },
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
)

messageSchema.index({ organizationId: 1, channelId: 1, createdAt: -1 })
messageSchema.index({ organizationId: 1, conversationId: 1, createdAt: -1 })

export const Message = mongoose.model<IMessage>('Message', messageSchema)
