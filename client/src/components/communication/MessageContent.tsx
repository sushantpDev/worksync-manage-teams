import type { ReactNode } from 'react'
import type { MessageMention } from '../../types'
import { cn } from '../../lib/utils'

export function MessageContent({
  content,
  mentions = [],
  className,
}: {
  content: string
  mentions?: MessageMention[]
  className?: string
}) {
  if (!content) return null

  if (!mentions.length) {
    return <p className={cn('whitespace-pre-wrap text-sm text-text-primary', className)}>{content}</p>
  }

  const sorted = [...mentions].sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []
  let cursor = 0

  for (const mention of sorted) {
    if (mention.start < cursor || mention.end > content.length) continue
    if (mention.start > cursor) {
      parts.push(content.slice(cursor, mention.start))
    }
    parts.push(
      <span
        key={`${mention.userId}-${mention.start}`}
        className="rounded-md bg-accent-purple/15 px-1 py-0.5 font-medium text-accent-purple"
      >
        {content.slice(mention.start, mention.end)}
      </span>
    )
    cursor = mention.end
  }

  if (cursor < content.length) {
    parts.push(content.slice(cursor))
  }

  return (
    <p className={cn('whitespace-pre-wrap text-sm text-text-primary', className)}>
      {parts}
    </p>
  )
}
