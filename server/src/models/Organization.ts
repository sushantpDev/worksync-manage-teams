import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IOrganization extends Document {
  _id: Types.ObjectId
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: Date
  updatedAt: Date
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  },
  { timestamps: true }
)

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema)
