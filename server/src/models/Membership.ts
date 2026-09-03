import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type MembershipRole = 'admin' | 'manager' | 'member' | 'viewer'

export interface IMembership extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  organizationId: Types.ObjectId
  role: MembershipRole
  createdAt: Date
  updatedAt: Date
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member', 'viewer'],
      required: true,
      default: 'member',
    },
  },
  { timestamps: true }
)

membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true })

export const Membership = mongoose.model<IMembership>('Membership', membershipSchema)
