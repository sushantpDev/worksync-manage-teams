import { CheckCheck } from 'lucide-react'
import { cn } from '../../lib/utils'

export function MessageReadReceipt({ status }: { status: 'sent' | 'read' }) {
  return (
    <CheckCheck
      className={cn(
        'h-3.5 w-3.5 shrink-0',
        status === 'read' ? 'text-[#53bdeb]' : 'text-text-muted'
      )}
      strokeWidth={2.25}
      aria-label={status === 'read' ? 'Seen' : 'Sent'}
    />
  )
}
