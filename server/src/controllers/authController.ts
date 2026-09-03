import type { Response } from 'express'
import bcrypt from 'bcryptjs'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import type { IMembership } from '../models/Membership'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { isValidEmail, isValidPassword, isValidAvatarUrl, normalizeEmail } from '../utils/validation'
import type { AuthRequest } from '../middleware/auth'
import {
  createOrganizationWithAdmin,
  getDefaultMembership,
  getMembershipForUser,
  getUserMemberships,
  migrateLegacyUserMembership,
} from '../services/membershipService'
import { deleteUserAvatar, uploadUserAvatar, validateAvatarFile } from '../services/avatarService'
import { isCloudinaryConfigured } from '../config/cloudinary'
import { config } from '../config'
import { sendPasswordResetEmail } from '../services/emailService'
import { generateInvitationToken, hashInvitationToken } from '../services/invitationToken'

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions."

function serializeUser(user: InstanceType<typeof User>, membership: IMembership | null) {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: membership?.role,
    organizationId: membership?.organizationId.toString(),
  }
}

function serializeOrganization(org: InstanceType<typeof Organization>) {
  return {
    id: org._id.toString(),
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    createdAt: org.createdAt.toISOString(),
  }
}

async function issueTokensForMembership(user: InstanceType<typeof User>, membership: IMembership) {
  const tokenPayload = {
    userId: user._id.toString(),
    organizationId: membership.organizationId.toString(),
    role: membership.role,
    email: user.email,
  }

  const accessToken = generateAccessToken(tokenPayload)
  const refreshToken = generateRefreshToken(tokenPayload)

  user.refreshToken = refreshToken
  await user.save()

  return { accessToken, refreshToken }
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Invalid email address' })
      return
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })

    const orgName = organizationName?.trim() || `${firstName.trim()}'s Organization`
    const { organization, membership } = await createOrganizationWithAdmin(user._id, orgName)

    const { accessToken, refreshToken } = await issueTokensForMembership(user, membership)

    res.status(201).json({
      user: serializeUser(user, membership),
      organization: serializeOrganization(organization),
      accessToken,
      refreshToken,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password +refreshToken')
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    await migrateLegacyUserMembership(user)

    const membership = await getDefaultMembership(user._id)
    if (!membership) {
      res.status(403).json({ error: 'No organization membership found for this user' })
      return
    }

    const { accessToken, refreshToken } = await issueTokensForMembership(user, membership)
    const organization = await Organization.findById(membership.organizationId)

    res.json({
      user: serializeUser(user, membership),
      organization: organization ? serializeOrganization(organization) : null,
      accessToken,
      refreshToken,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function refresh(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' })
      return
    }

    const payload = verifyRefreshToken(refreshToken)
    const user = await User.findById(payload.userId).select('+refreshToken')

    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' })
      return
    }

    if (user.refreshToken !== refreshToken) {
      if (user.refreshToken) {
        user.refreshToken = undefined
        await user.save()
      }
      res.status(401).json({ error: 'Invalid refresh token' })
      return
    }

    await migrateLegacyUserMembership(user)

    let membership = await getMembershipForUser(user._id, payload.organizationId)
    if (!membership) {
      membership = await getDefaultMembership(user._id)
    }
    if (!membership) {
      res.status(403).json({ error: 'No organization membership found' })
      return
    }

    const tokens = await issueTokensForMembership(user, membership)

    res.json(tokens)
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.user?.userId) {
      await User.findByIdAndUpdate(req.user.userId, { $unset: { refreshToken: 1 } })
      res.json({ message: 'Logged out successfully' })
      return
    }

    const { refreshToken } = req.body
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken)
        await User.findByIdAndUpdate(payload.userId, { $unset: { refreshToken: 1 } })
      } catch {
        // ignore
      }
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user?.userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    await migrateLegacyUserMembership(user)

    const memberships = await getUserMemberships(user._id)
    const organizations = memberships.map((m) => {
      const org = m.organizationId as unknown as InstanceType<typeof Organization>
      return {
        organization: serializeOrganization(org),
        role: m.role,
      }
    })

    let currentMembership = req.user?.organizationId
      ? await getMembershipForUser(user._id, req.user.organizationId)
      : null

    if (!currentMembership) {
      currentMembership = await getDefaultMembership(user._id)
    }

    const currentOrganization = currentMembership
      ? await Organization.findById(currentMembership.organizationId)
      : null

    res.json({
      ...serializeUser(user, currentMembership),
      organization: currentOrganization ? serializeOrganization(currentOrganization) : null,
      organizations,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user?.userId).select('+refreshToken')
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { firstName, lastName, email, avatarUrl } = req.body as {
      firstName?: string
      lastName?: string
      email?: string
      avatarUrl?: string | null
    }

    if (firstName !== undefined) {
      const trimmed = firstName.trim()
      if (!trimmed) {
        res.status(400).json({ error: 'First name is required' })
        return
      }
      user.firstName = trimmed
    }

    if (lastName !== undefined) {
      const trimmed = lastName.trim()
      if (!trimmed) {
        res.status(400).json({ error: 'Last name is required' })
        return
      }
      user.lastName = trimmed
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        user.avatarUrl = undefined
      } else if (!isValidAvatarUrl(avatarUrl)) {
        res.status(400).json({ error: 'Avatar URL must be a valid http or https URL' })
        return
      } else {
        user.avatarUrl = avatarUrl.trim()
      }
    }

    let emailChanged = false
    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email)
      if (!normalizedEmail) {
        res.status(400).json({ error: 'Email is required' })
        return
      }
      if (!isValidEmail(normalizedEmail)) {
        res.status(400).json({ error: 'Invalid email address' })
        return
      }
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail })
        if (existing && existing._id.toString() !== user._id.toString()) {
          res.status(409).json({ error: 'Email is already in use' })
          return
        }
        user.email = normalizedEmail
        emailChanged = true
      }
    }

    await user.save()

    await migrateLegacyUserMembership(user)

    let currentMembership = req.user?.organizationId
      ? await getMembershipForUser(user._id, req.user.organizationId)
      : null

    if (!currentMembership) {
      currentMembership = await getDefaultMembership(user._id)
    }

    const responseBody: Record<string, unknown> = {
      user: serializeUser(user, currentMembership),
    }

    if (emailChanged && currentMembership) {
      const tokens = await issueTokensForMembership(user, currentMembership)
      responseBody.accessToken = tokens.accessToken
      responseBody.refreshToken = tokens.refreshToken
    }

    res.json(responseBody)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string
      newPassword?: string
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' })
      return
    }

    if (!isValidPassword(newPassword)) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    const user = await User.findById(req.user?.userId).select('+password +refreshToken')
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password)
    if (!passwordMatches) {
      res.status(400).json({ error: 'Current password is incorrect' })
      return
    }

    user.password = await bcrypt.hash(newPassword, 12)
    user.refreshToken = undefined
    await user.save()

    res.json({ message: 'Password changed successfully. Please sign in again.' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email?: string }

    if (!email || !email.trim()) {
      res.status(400).json({ error: 'Email is required' })
      return
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Invalid email address' })
      return
    }

    const normalizedEmail = normalizeEmail(email)
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordResetToken +passwordResetExpiresAt'
    )

    if (!user) {
      res.json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE })
      return
    }

    const rawToken = generateInvitationToken()
    const tokenHash = hashInvitationToken(rawToken)
    const expiresAt = new Date(Date.now() + config.passwordResetExpiryMinutes * 60 * 1000)

    user.passwordResetToken = tokenHash
    user.passwordResetExpiresAt = expiresAt
    await user.save()

    const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}`

    try {
      await sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        resetUrl,
        expiresInMinutes: config.passwordResetExpiryMinutes,
      })
    } catch (emailError) {
      user.passwordResetToken = undefined
      user.passwordResetExpiresAt = undefined
      await user.save()
      console.error('[auth] Failed to send password reset email:', (emailError as Error).message)
    }

    res.json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE })
  } catch (error) {
    console.error('[auth] forgotPassword error:', (error as Error).message)
    res.status(500).json({ error: 'Unable to process password reset request' })
  }
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body as {
      token?: string
      newPassword?: string
    }

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Reset token and new password are required' })
      return
    }

    if (!isValidPassword(newPassword)) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    const tokenHash = hashInvitationToken(token)
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+password +passwordResetToken +passwordResetExpiresAt +refreshToken')

    if (!user) {
      res.status(400).json({ error: 'Reset link is invalid or has expired.' })
      return
    }

    user.password = await bcrypt.hash(newPassword, 12)
    user.passwordResetToken = undefined
    user.passwordResetExpiresAt = undefined
    user.refreshToken = undefined
    await user.save()

    res.json({ message: 'Password reset successfully.' })
  } catch (error) {
    console.error('[auth] resetPassword error:', (error as Error).message)
    res.status(500).json({ error: 'Unable to reset password' })
  }
}

async function getCurrentMembership(req: AuthRequest, userId: string) {
  let currentMembership = req.user?.organizationId
    ? await getMembershipForUser(userId, req.user.organizationId)
    : null

  if (!currentMembership) {
    currentMembership = await getDefaultMembership(userId)
  }

  return currentMembership
}

export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!isCloudinaryConfigured()) {
      res.status(503).json({ error: 'Avatar upload is not configured' })
      return
    }

    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'No image file provided' })
      return
    }

    const validationError = validateAvatarFile(file.mimetype, file.size)
    if (validationError) {
      res.status(400).json({ error: validationError })
      return
    }

    const userId = req.user!.userId
    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const avatarUrl = await uploadUserAvatar(userId, file.buffer, file.mimetype)
    user.avatarUrl = avatarUrl
    await user.save()

    const currentMembership = await getCurrentMembership(req, userId)

    res.json({
      avatarUrl,
      user: serializeUser(user, currentMembership),
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export async function deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId
    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    if (isCloudinaryConfigured()) {
      await deleteUserAvatar(userId)
    }

    user.avatarUrl = undefined
    await user.save()

    const currentMembership = await getCurrentMembership(req, userId)

    res.json({
      avatarUrl: null,
      user: serializeUser(user, currentMembership),
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

