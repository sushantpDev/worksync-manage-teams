import { ArrowLeft, ChevronRight, Hash } from 'lucide-react'
import type { CommunicationSelection } from '../../types'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'

export function ChatHeader({
  selection,
  subtitle,
  connected,
  showBack,
  onBack,
  onOpenTeamDetails,
}: {
  selection: CommunicationSelection | null
  subtitle?: string
  connected: boolean
  showBack?: boolean
  onBack?: () => void
  onOpenTeamDetails?: () => void
}) {
  if (!selection) {
    return (
      <div className="flex h-14 shrink-0 items-center border-b border-[#e7eaf0] bg-white px-5">
        <p className="text-sm text-[#667085]">Select a conversation to start messaging.</p>
      </div>
    )
  }

  const isChannel = selection.type === 'channel'
  const dmParticipant = !isChannel ? selection.participant : null
  const dmName = dmParticipant
    ? `${dmParticipant.firstName} ${dmParticipant.lastName}`
    : selection.title
  const teamDetailsClickable = isChannel && onOpenTeamDetails

  const titleBlock = (
    <div className="min-w-0 flex-1">
      <h2 className="truncate text-[15px] font-semibold text-gray-900">
        {isChannel ? `# ${selection.slug}` : dmName}
      </h2>
      {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
    </div>
  )

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e7eaf0] bg-white px-5">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 text-[#667085] hover:bg-[#f4f1ff] lg:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}

      {teamDetailsClickable ? (
        <button
          type="button"
          onClick={onOpenTeamDetails}
          className={cn(
            '-mx-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-1',
            'cursor-pointer transition-colors hover:bg-[#f8f6ff]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d45c2]/25'
          )}
          aria-label={`Team details for ${subtitle ?? selection.title}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee8ff]">
            <Hash className="h-4 w-4 text-[#6d45c2]" />
          </div>
          {titleBlock}
          <ChevronRight className="h-4 w-4 shrink-0 text-[#98a2b3]" />
        </button>
      ) : (
        <>
          {isChannel ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee8ff]">
              <Hash className="h-4 w-4 text-[#6d45c2]" />
            </div>
          ) : (
            <Avatar
              userId={dmParticipant?.id}
              name={dmName}
              src={dmParticipant?.avatarUrl}
              size="sm"
            />
          )}
          {titleBlock}
        </>
      )}

      {!connected && (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          Reconnecting...
        </span>
      )}
    </div>
  )
}
