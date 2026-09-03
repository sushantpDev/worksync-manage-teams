import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ITeam extends Document {
  _id: Types.ObjectId
  name: string
  description?: string
  organizationId: Types.ObjectId
  memberIds: Types.ObjectId[]
  leadId?: Types.ObjectId
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    leadId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

teamSchema.index({ organizationId: 1 })

export const Team = mongoose.model<ITeam>('Team', teamSchema)
