/** Escape special regex characters in user search input. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildContainsRegex(query: string): RegExp {
  return new RegExp(escapeRegex(query), 'i')
}

export function buildStartsWithRegex(query: string): RegExp {
  return new RegExp(`^${escapeRegex(query)}`, 'i')
}

export function normalizeSearchQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed.length < 2) return null
  return trimmed.slice(0, 100)
}

export function clampSearchLimit(raw: unknown, fallback = 5, max = 10): number {
  if (raw === undefined || raw === null || raw === '') return fallback
  const parsed = Number.parseInt(String(raw), 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), max)
}

export function rankByQueryMatch<T>(
  items: T[],
  getSearchText: (item: T) => string,
  query: string
): T[] {
  const lower = query.toLowerCase()
  return [...items].sort((a, b) => {
    const aText = getSearchText(a).toLowerCase()
    const bText = getSearchText(b).toLowerCase()
    const aStarts = aText.startsWith(lower) ? 0 : 1
    const bStarts = bText.startsWith(lower) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    return aText.localeCompare(bText)
  })
}
