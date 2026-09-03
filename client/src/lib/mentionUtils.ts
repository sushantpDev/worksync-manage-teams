export interface MentionCandidate {
  id: string
  firstName: string
  lastName: string
  email?: string
  avatarUrl?: string
}

export interface MentionDraft {
  userId: string
  displayName: string
}

export interface MessageMentionInput {
  userId: string
  displayName: string
  start: number
  end: number
}

export function mentionDisplayName(candidate: MentionCandidate): string {
  return `${candidate.firstName} ${candidate.lastName}`.trim()
}

export function mentionToken(displayName: string): string {
  return `@${displayName}`
}

export function getMentionQuery(
  content: string,
  cursor: number,
  drafts: MentionDraft[] = []
): { query: string; triggerStart: number } | null {
  for (const draft of drafts) {
    const token = mentionToken(draft.displayName)
    let from = 0
    while (from < content.length) {
      const start = content.indexOf(token, from)
      if (start < 0) break
      const end = start + token.length
      if (cursor > start && cursor <= end) return null
      from = start + 1
    }
  }

  const before = content.slice(0, cursor)
  const match = before.match(/(^|[\s([{])@([^\s@\n]*)$/)
  if (!match) return null
  const query = match[2]
  const triggerStart = cursor - query.length - 1
  return { query, triggerStart }
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string
): MentionCandidate[] {
  const q = query.trim().toLowerCase()
  if (!q) return candidates
  return candidates.filter((candidate) => {
    const fullName = mentionDisplayName(candidate).toLowerCase()
    const email = candidate.email?.toLowerCase() ?? ''
    return fullName.includes(q) || email.includes(q)
  })
}

export function resolveMentionsForSend(
  content: string,
  drafts: MentionDraft[]
): MessageMentionInput[] {
  const seen = new Set<string>()
  const resolved: MessageMentionInput[] = []
  let searchFrom = 0

  for (const draft of drafts) {
    if (seen.has(draft.userId)) continue
    const token = mentionToken(draft.displayName)
    const start = content.indexOf(token, searchFrom)
    if (start < 0) continue
    const end = start + token.length
    seen.add(draft.userId)
    resolved.push({
      userId: draft.userId,
      displayName: draft.displayName,
      start,
      end,
    })
    searchFrom = end
  }

  return resolved
}

export function draftsFromMessageMentions(
  mentions: { userId: string; name: string }[]
): MentionDraft[] {
  const seen = new Set<string>()
  return mentions.reduce<MentionDraft[]>((acc, mention) => {
    if (seen.has(mention.userId)) return acc
    seen.add(mention.userId)
    acc.push({ userId: mention.userId, displayName: mention.name })
    return acc
  }, [])
}

export function pruneMentionDrafts(content: string, drafts: MentionDraft[]): MentionDraft[] {
  return drafts.filter((draft) => content.includes(mentionToken(draft.displayName)))
}

export function insertMentionAt(
  content: string,
  cursor: number,
  triggerStart: number,
  displayName: string
): { nextContent: string; nextCursor: number } {
  const before = content.slice(0, triggerStart)
  const after = content.slice(cursor)
  const token = mentionToken(displayName)
  const spacer = after.startsWith(' ') ? '' : ' '
  const nextContent = `${before}${token}${spacer}${after}`
  const nextCursor = before.length + token.length + spacer.length
  return { nextContent, nextCursor }
}
