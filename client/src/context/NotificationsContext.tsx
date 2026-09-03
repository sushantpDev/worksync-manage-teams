import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Notification } from '../types'
import { notificationsApi } from '../lib/api'
import { useAuth } from './AuthContext'

interface NotificationsContextValue {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { organization, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !organization?.id) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setLoading(true)
    try {
      const data = await notificationsApi.list()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, organization?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markRead = useCallback(
    async (id: string) => {
      await notificationsApi.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    []
  )

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })))
    setUnreadCount(0)
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead]
  )

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return ctx
}
