import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { MembershipRole } from './Membership'

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface IInvitation extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  email: string
  role: MembershipRole
  invitedBy: Types.ObjectId
  tokenHash: string
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const invitationSchema = new Schema<IInvitation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member', 'viewer'],
      required: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

invitationSchema.index({ organizationId: 1, email: 1, status: 1 })
invitationSchema.index({ organizationId: 1, createdAt: -1 })

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema)
