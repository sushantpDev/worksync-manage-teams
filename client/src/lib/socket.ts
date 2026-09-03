import { io, type Socket } from 'socket.io-client'
import { orgStorage } from './orgStorage'
import { tokenStorage } from './tokenStorage'

let socket: Socket | null = null

export function getCommunicationSocket(): Socket | null {
  return socket
}

export function connectCommunicationSocket(): Socket | null {
  const token = tokenStorage.getAccessToken()
  const organizationId = orgStorage.getOrganizationId()
  if (!token || !organizationId) return null

  if (socket?.connected) {
    socket.disconnect()
  }

  const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
    window.location.origin

  socket = io(SOCKET_URL, {
    auth: { token, organizationId },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })

  return socket
}

export function disconnectCommunicationSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function reconnectCommunicationSocket(): Socket | null {
  disconnectCommunicationSocket()
  return connectCommunicationSocket()
}
