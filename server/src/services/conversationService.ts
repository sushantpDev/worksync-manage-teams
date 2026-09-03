import { Conversation } from '../models/Conversation'
import { Membership } from '../models/Membership'
import { buildDirectKey } from './communicationUtils'

export async function findOrCreateDirectConversation(
  orgId: string,
  currentUserId: string,
  targetUserId: string
) {
  if (currentUserId === targetUserId) {
    throw new Error('Cannot start a direct conversation with yourself')
  }

  const targetMembership = await Membership.findOne({
    organizationId: orgId,
    userId: targetUserId,
  })
  if (!targetMembership) {
    throw new Error('Target user is not a member of this organization')
  }

  const directKey = buildDirectKey(currentUserId, targetUserId)
  const existing = await Conversation.findOne({ organizationId: orgId, directKey })
  if (existing) return existing

  try {
    return await Conversation.create({
      organizationId: orgId,
      type: 'direct',
      participantIds: [currentUserId, targetUserId],
      directKey,
    })
  } catch (error) {
    const mongoError = error as { code?: number }
    if (mongoError.code === 11000) {
      const raced = await Conversation.findOne({ organizationId: orgId, directKey })
      if (raced) return raced
    }
    throw error
  }
}
