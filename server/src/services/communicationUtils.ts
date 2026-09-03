export const ALLOWED_REACTION_EMOJIS = ['👍', '❤️', '🎉', '👀', '✅'] as const

export const MESSAGE_MAX_LENGTH = 5000
export const MESSAGE_PAGE_DEFAULT = 30
export const MESSAGE_PAGE_MAX = 50

export function slugifyChannelName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'channel'
}

export function buildDirectKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(':')
}

export function normalizeMessageContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim()
}

export function isValidMessageContent(content: string, hasAttachments: boolean): boolean {
  if (hasAttachments) return true
  const normalized = normalizeMessageContent(content)
  return normalized.length > 0 && normalized.length <= MESSAGE_MAX_LENGTH
}
