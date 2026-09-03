import { useNavigate, useOutletContext } from 'react-router-dom'
import { PageHeader } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useNotifications } from '../context/NotificationsContext'
import { formatRelativeTime } from '../lib/utils'
import type { Notification } from '../types'

function getNotificationPath(notif: Notification): string | null {
  if (notif.type === 'communication_mention') {
    if (notif.channelId) {
      const params = new URLSearchParams({ channel: notif.channelId })
      if (notif.messageId) params.set('message', notif.messageId)
      return `/communication?${params.toString()}`
    }
    if (notif.conversationId) {
      const params = new URLSearchParams({ conversation: notif.conversationId })
      if (notif.messageId) params.set('message', notif.messageId)
      return `/communication?${params.toString()}`
    }
  }
  if (notif.projectId) return `/projects/${notif.projectId}`
  return null
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()
  const { notifications, loading, unreadCount, markRead, markAllRead, refresh } =
    useNotifications()

  async function handleOpen(notif: Notification) {
    if (!notif.isRead) {
      await markRead(notif.id)
    }
    const path = getNotificationPath(notif)
    if (path) navigate(path)
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on project and team activity."
        mobileNavOpen={mobileNavOpen}
        onMobileNavToggle={() => setMobileNavOpen(!mobileNavOpen)}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllRead()}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {loading && <LoadingState message="Loading notifications..." />}

      {!loading && notifications.length === 0 && (
        <EmptyState
          title="No notifications"
          description="You're all caught up. Activity from your organization will appear here."
          actionLabel="Refresh"
          onAction={refresh}
        />
      )}

      {!loading && notifications.length > 0 && (
        <Card padding="none">
          <div className="divide-y divide-border-subtle">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => handleOpen(notif)}
                className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-surface/60 ${
                  !notif.isRead ? 'bg-card-muted/80' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                    {!notif.isRead && <Badge variant="info">New</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-text-secondary">{notif.message}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {formatRelativeTime(notif.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
