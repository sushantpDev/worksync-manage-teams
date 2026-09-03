import { Channel } from '../models/Channel'

export async function ensureGeneralChannel(
  orgId: string,
  teamId: string,
  createdBy: string
) {
  const existing = await Channel.findOne({
    organizationId: orgId,
    teamId,
    slug: 'general',
    isDeleted: false,
  })
  if (existing) return existing

  try {
    return await Channel.create({
      organizationId: orgId,
      teamId,
      name: 'General',
      slug: 'general',
      description: 'General team discussion',
      createdBy,
      isGeneral: true,
    })
  } catch (error) {
    const mongoError = error as { code?: number }
    if (mongoError.code === 11000) {
      const raced = await Channel.findOne({
        organizationId: orgId,
        teamId,
        slug: 'general',
      })
      if (raced) return raced
    }
    throw error
  }
}

export async function ensureGeneralChannelsForTeams(
  orgId: string,
  teamIds: string[],
  createdBy: string
) {
  await Promise.all(teamIds.map((teamId) => ensureGeneralChannel(orgId, teamId, createdBy)))
}
