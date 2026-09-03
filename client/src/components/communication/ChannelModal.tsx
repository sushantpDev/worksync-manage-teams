import { useEffect, useState } from 'react'
import { ApiError, communicationApi } from '../../lib/api'
import type { CommunicationChannelSummary } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const fieldClass =
  'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20'

const MAX_NAME_LENGTH = 80
const MAX_DESCRIPTION_LENGTH = 500

export function ChannelModal({
  open,
  onClose,
  mode,
  teamId,
  teamName,
  channel,
  renameOnly = false,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  teamId?: string
  teamName?: string
  channel?: CommunicationChannelSummary | null
  renameOnly?: boolean
  onSuccess: (updated?: CommunicationChannelSummary) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && channel) {
      setName(channel.name)
      setDescription(channel.description ?? '')
    } else {
      setName('')
      setDescription('')
    }
    setError(null)
  }, [open, mode, channel])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Channel name is required')
      return
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Channel name must be ${MAX_NAME_LENGTH} characters or fewer`)
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'create' && teamId) {
        await communicationApi.createChannel(teamId, {
          name: trimmedName,
          description: description.trim() || undefined,
        })
        onSuccess()
      } else if (mode === 'edit' && channel) {
        const payload: { name?: string; description?: string } = {}
        if (renameOnly) {
          if (channel.isGeneral) {
            setError('The general channel cannot be renamed')
            return
          }
          payload.name = trimmedName
        } else {
          if (!channel.isGeneral) payload.name = trimmedName
          payload.description = description.trim()
        }
        const updated = await communicationApi.updateChannel(channel.id, payload)
        onSuccess({
          ...channel,
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save channel')
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    mode === 'create'
      ? 'Create channel'
      : renameOnly
        ? 'Rename channel'
        : 'Edit channel'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={
        mode === 'create'
          ? `Add a channel to ${teamName ?? 'team'}`
          : channel?.isGeneral
            ? 'Update the general channel description'
            : undefined
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {(!renameOnly || mode === 'create') && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-primary">Name</span>
            <input
              type="text"
              required
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              placeholder="Frontend"
              disabled={mode === 'edit' && channel?.isGeneral}
            />
          </label>
        )}

        {!renameOnly && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-primary">
              Description{mode === 'create' ? ' (optional)' : ''}
            </span>
            <textarea
              maxLength={MAX_DESCRIPTION_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
              placeholder="What is this channel for?"
            />
          </label>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create channel'
                : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
