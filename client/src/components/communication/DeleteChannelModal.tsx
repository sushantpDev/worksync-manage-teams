import { useState } from 'react'
import { ApiError, communicationApi } from '../../lib/api'
import type { CommunicationChannelSummary } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function DeleteChannelModal({
  open,
  onClose,
  channel,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  channel: CommunicationChannelSummary | null
  onSuccess: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete() {
    if (!channel) return
    setError(null)
    setSubmitting(true)
    try {
      await communicationApi.deleteChannel(channel.id)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete channel')
    } finally {
      setSubmitting(false)
    }
  }

  if (!channel) return null

  return (
    <Modal open={open} onClose={onClose} title={`Delete #${channel.slug}?`}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Messages in this channel will no longer be available to users.
        </p>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleDelete} disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete channel'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
