import type { Types } from 'mongoose'
import { Membership, type MembershipRole } from '../models/Membership'
import { Organization } from '../models/Organization'
import { User, type IUser } from '../models/User'

export type MembershipWithOrganization = {
  organizationId: Types.ObjectId
  role: MembershipRole
  organization: InstanceType<typeof Organization>
}

export async function migrateLegacyUserMembership(user: IUser): Promise<void> {
  const existing = await Membership.countDocuments({ userId: user._id })
  if (existing > 0) return

  const legacyOrgId = (user as IUser & { organizationId?: Types.ObjectId }).organizationId
  const legacyRole = (user as IUser & { role?: MembershipRole }).role ?? 'member'

  if (!legacyOrgId) return

  await Membership.create({
    userId: user._id,
    organizationId: legacyOrgId,
    role: legacyRole,
  })
}

export async function getUserMemberships(userId: Types.ObjectId | string) {
  return Membership.find({ userId }).populate<{ organizationId: InstanceType<typeof Organization> }>(
    'organizationId'
  )
}

export async function getMembershipForUser(
  userId: Types.ObjectId | string,
  organizationId: Types.ObjectId | string
) {
  return Membership.findOne({ userId, organizationId })
}

export async function getDefaultMembership(userId: Types.ObjectId | string) {
  const user = await User.findById(userId)
  if (!user) return null

  if (user.defaultOrganizationId) {
    const preferred = await Membership.findOne({
      userId,
      organizationId: user.defaultOrganizationId,
    })
    if (preferred) return preferred
  }

  return Membership.findOne({ userId }).sort({ createdAt: 1 })
}

export async function createOrganizationWithAdmin(
  userId: Types.ObjectId | string,
  name: string,
  slug?: string
) {
  const orgName = name.trim()
  const baseSlug =
    slug?.trim() ||
    orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  const organization = await Organization.create({
    name: orgName,
    slug: `${baseSlug}-${Date.now()}`,
    plan: 'free',
  })

  const membership = await Membership.create({
    userId,
    organizationId: organization._id,
    role: 'admin',
  })

  await User.findByIdAndUpdate(userId, { defaultOrganizationId: organization._id })

  return { organization, membership }
}

export function slugifyOrganizationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
