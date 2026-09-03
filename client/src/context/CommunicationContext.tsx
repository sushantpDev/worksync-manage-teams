import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { communicationApi } from '../lib/api'
import {
  disconnectCommunicationSocket,
  getCommunicationSocket,
  reconnectCommunicationSocket,
} from '../lib/socket'

type CommunicationContextValue = {
  totalUnread: number
  refreshUnread: () => Promise<void>
  connected: boolean
}

const CommunicationContext = createContext<CommunicationContextValue>({
  totalUnread: 0,
  refreshUnread: async () => {},
  connected: false,
})

export function CommunicationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, organization } = useAuth()
  const [totalUnread, setTotalUnread] = useState(0)
  const [connected, setConnected] = useState(false)

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated || !organization?.id) {
      setTotalUnread(0)
      return
    }
    try {
      const data = await communicationApi.getUnreadTotal()
      setTotalUnread(data.totalUnread)
    } catch {
      setTotalUnread(0)
    }
  }, [isAuthenticated, organization?.id])

  useEffect(() => {
    if (!isAuthenticated || !organization?.id) {
      disconnectCommunicationSocket()
      setConnected(false)
      setTotalUnread(0)
      return
    }

    const socket = reconnectCommunicationSocket()
    if (!socket) return

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onUnread = () => {
      refreshUnread()
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('communication:unread', onUnread)
    socket.on('communication:read', onUnread)

    refreshUnread()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('communication:unread', onUnread)
      socket.off('communication:read', onUnread)
      disconnectCommunicationSocket()
      setConnected(false)
    }
  }, [isAuthenticated, organization?.id, refreshUnread])

  return (
    <CommunicationContext.Provider value={{ totalUnread, refreshUnread, connected }}>
      {children}
    </CommunicationContext.Provider>
  )
}

export function useCommunication() {
  return useContext(CommunicationContext)
}

export function useCommunicationSocket() {
  return getCommunicationSocket()
}
