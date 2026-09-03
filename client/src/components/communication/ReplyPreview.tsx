import { X } from 'lucide-react'
import type { CommunicationMessage } from '../../types'

export function ReplyPreview({
  message,
  onCancel,
}: {
  message: CommunicationMessage
  onCancel: () => void
}) {
  const senderName = message.sender
    ? `${message.sender.firstName} ${message.sender.lastName}`
    : 'Unknown'

  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div
        className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full bg-[#6264a7]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#464775]">Replying to {senderName}</p>
        <p className="truncate text-xs text-gray-500">
          {message.deletedAt ? 'Deleted message' : message.content || 'Attachment'}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
        aria-label="Cancel reply"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
