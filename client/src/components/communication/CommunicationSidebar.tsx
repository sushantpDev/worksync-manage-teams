import { ChevronDown, ChevronRight, Hash, MessageSquarePlus, Plus } from 'lucide-react'
import { useState } from 'react'
import type {
  CommunicationChannelSummary,
  CommunicationSelection,
  CommunicationSidebarData,
  DirectMessageSummary,
} from '../../types'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'
import { ChannelActionsMenu } from './ChannelActionsMenu'

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#6d45c2] px-1 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function SectionHeader({
  label,
  onAction,
  actionLabel,
}: {
  label: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <div className="mb-2 flex items-center justify-between px-4 pt-5 first:pt-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7d8798]">
        {label}
      </span>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full p-1 text-[#7d8798] transition-colors hover:bg-[#eee8ff] hover:text-[#6d45c2]"
          aria-label={actionLabel ?? `Add ${label.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function CommunicationSidebar({
  data,
  selection,
  loading,
  canManageChannels,
  onSelectChannel,
  onSelectDirect,
  onNewMessage,
  onCreateChannel,
  onRenameChannel,
  onEditChannel,
  onDeleteChannel,
}: {
  data: CommunicationSidebarData | null
  selection: CommunicationSelection | null
  loading: boolean
  canManageChannels: boolean
  onSelectChannel: (teamId: string, channel: CommunicationChannelSummary, teamName: string) => void
  onSelectDirect: (dm: DirectMessageSummary) => void
  onNewMessage: () => void
  onCreateChannel: (teamId: string, teamName: string) => void
  onRenameChannel: (channel: CommunicationChannelSummary) => void
  onEditChannel: (channel: CommunicationChannelSummary) => void
  onDeleteChannel: (channel: CommunicationChannelSummary) => void
}) {
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({})

  function toggleTeam(teamId: string) {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }))
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-3 px-4 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[#e8e2fa]" />
            <div className="ml-3 h-8 animate-pulse rounded-xl bg-white" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fbf9ff]">
      <div className="flex-1 overflow-y-auto pb-4">
        <SectionHeader label="Teams" />

        {data.teams.length === 0 ? (
          <p className="px-4 py-2 text-sm text-[#667085]">You aren&apos;t part of any teams yet.</p>
        ) : (
          <div className="space-y-1 px-2">
            {data.teams.map((team) => {
              const expanded = expandedTeams[team.id] ?? true
              return (
                <div key={team.id}>
                  <div className="group/team flex items-center pr-1">
                    <button
                      type="button"
                      onClick={() => toggleTeam(team.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white"
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#98a2b3]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#98a2b3]" />
                      )}
                      <span className="truncate text-[13px] font-semibold text-[#07111f]">
                        {team.name}
                      </span>
                    </button>
                    {canManageChannels && (
                      <button
                        type="button"
                        onClick={() => onCreateChannel(team.id, team.name)}
                        className="rounded-full p-1 text-[#98a2b3] opacity-0 transition-all hover:bg-white hover:text-[#6d45c2] group-hover/team:opacity-100"
                        aria-label={`Create channel in ${team.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {expanded && (
                    <div className="ml-3 border-l border-[#ece7fb] pl-2">
                      {team.channels.map((channel) => {
                        const active =
                          selection?.type === 'channel' && selection.channelId === channel.id
                        const hasUnread = channel.unreadCount > 0
                        return (
                          <div
                            key={channel.id}
                            className={cn(
                              'group/channel relative flex items-center pr-1',
                              active && 'before:absolute before:-left-2 before:bottom-1 before:top-1 before:w-0.5 before:rounded-full before:bg-[#6d45c2]'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectChannel(team.id, channel, team.name)}
                              className={cn(
                                'flex min-w-0 flex-1 items-center gap-2 rounded-xl py-2 pl-3 pr-2 text-left text-[13px] transition-colors',
                                active
                                  ? 'bg-white font-semibold text-[#5b35a6] shadow-sm'
                                  : hasUnread
                                    ? 'font-semibold text-[#07111f] hover:bg-white'
                                    : 'text-[#5f6b7a] hover:bg-white hover:text-[#07111f]'
                              )}
                            >
                              <Hash
                                className={cn(
                                  'h-4 w-4 shrink-0',
                                  active ? 'text-[#6d45c2]' : 'text-[#98a2b3]'
                                )}
                                strokeWidth={active ? 2.25 : 1.75}
                              />
                              <span className="truncate">{channel.slug}</span>
                              <UnreadBadge count={channel.unreadCount} />
                            </button>
                            {canManageChannels && (
                              <ChannelActionsMenu
                                isGeneral={channel.isGeneral}
                                onRename={() => onRenameChannel(channel)}
                                onEditDetails={() => onEditChannel(channel)}
                                onDelete={() => onDeleteChannel(channel)}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <SectionHeader label="Direct messages" onAction={onNewMessage} actionLabel="New message" />

        {data.directMessages.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-sm text-[#667085]">No direct messages yet.</p>
            <button
              type="button"
              onClick={onNewMessage}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#ded9f6] bg-white px-3 py-1.5 text-sm font-medium text-[#344054] shadow-sm transition-colors hover:bg-[#f4f1ff]"
            >
              <MessageSquarePlus className="h-4 w-4 text-[#6d45c2]" />
              New message
            </button>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {data.directMessages.map((dm) => {
              const active =
                selection?.type === 'direct' && selection.conversationId === dm.id
              const hasUnread = dm.unreadCount > 0
              const name = dm.participant
                ? `${dm.participant.firstName} ${dm.participant.lastName}`
                : 'Unknown'
              return (
                <button
                  key={dm.id}
                  type="button"
                  onClick={() => onSelectDirect(dm)}
                  className={cn(
                    'relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'bg-white font-semibold text-[#5b35a6] shadow-sm'
                      : hasUnread
                        ? 'font-semibold text-[#07111f] hover:bg-white'
                        : 'text-[#344054] hover:bg-white'
                  )}
                >
                  <Avatar
                    userId={dm.participant?.id}
                    name={name}
                    src={dm.participant?.avatarUrl}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{name}</p>
                    {dm.lastMessagePreview && !hasUnread && (
                      <p className="truncate text-xs text-[#98a2b3]">{dm.lastMessagePreview}</p>
                    )}
                  </div>
                  <UnreadBadge count={dm.unreadCount} />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
