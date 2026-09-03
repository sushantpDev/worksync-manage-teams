import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IChannel extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  teamId: Types.ObjectId
  name: string
  slug: string
  description?: string
  createdBy: Types.ObjectId
  isGeneral: boolean
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const channelSchema = new Schema<IChannel>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isGeneral: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

channelSchema.index({ organizationId: 1, teamId: 1, slug: 1 }, { unique: true })
channelSchema.index({ organizationId: 1, teamId: 1, isDeleted: 1 })

export const Channel = mongoose.model<IChannel>('Channel', channelSchema)
