import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IUser extends Document {
  _id: Types.ObjectId
  email: string
  password: string
  firstName: string
  lastName: string
  avatarUrl?: string
  defaultOrganizationId?: Types.ObjectId
  refreshToken?: string
  passwordResetToken?: string
  passwordResetExpiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    defaultOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
)

userSchema.index({ passwordResetToken: 1 }, { sparse: true })

export const User = mongoose.model<IUser>('User', userSchema)

/** @deprecated Use MembershipRole from Membership model */
export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'
