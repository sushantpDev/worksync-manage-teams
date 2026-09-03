import type {
  AuthResponse,
  AuthTokens,
  MeResponse,
  OrganizationMembership,
  RegisterPayload,
  UpdateProfilePayload,
  UpdateProfileResponse,
  AvatarUploadResponse,
} from '../types/auth'
import type {
  CreateCommentPayload,
  CreateProjectPayload,
  CreateTaskPayload,
  OrganizationMember,
  Project,
  Task,
  UpdateCommentPayload,
  UpdateProjectPayload,
  UpdateProjectTeamPayload,
  UpdateTaskPayload,
  Comment,
  TaskAttachment,
  Activity,
  Notification,
  NotificationsListResponse,
  DashboardResponse,
  Invitation,
  InvitationPreview,
  AcceptInvitationResponse,
  SearchResponse,
  ReportsResponse,
  ReportRange,
  Team,
  CreateTeamPayload,
  UpdateTeamPayload,
  TeamMembersResponse,
  CommunicationSidebarData,
  CommunicationMessage,
  MessagesPage,
} from '../types'
import { orgStorage } from './orgStorage'
import { tokenStorage } from './tokenStorage'
import { triggerFileDownload } from './utils'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let refreshInFlight: Promise<boolean> | null = null

function getAuthHeaders(): HeadersInit {
  const token = tokenStorage.getAccessToken()
  const orgId = orgStorage.getOrganizationId()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { 'X-Organization-Id': orgId } : {}),
  }
}

function normalizeErrorMessage(raw: unknown, fallback = 'Request failed'): string {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    const first = raw.find((item) => typeof item === 'string') ?? raw[0]
    return normalizeErrorMessage(first, fallback)
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
    if (record.error) return normalizeErrorMessage(record.error, fallback)
  }
  if (raw != null && typeof raw !== 'object') return String(raw)
  return fallback
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    return normalizeErrorMessage(error.message, fallback)
  }
  if (error instanceof Error) {
    return normalizeErrorMessage(error.message, fallback)
  }
  return normalizeErrorMessage(error, fallback)
}

async function parseError(response: Response): Promise<string> {
  const fallback =
    response.status === 401
      ? 'Invalid credentials'
      : response.status === 403
        ? 'Access denied'
        : response.status === 429
          ? 'Too many requests. Please try again later.'
          : `Request failed (${response.status})`

  const body = await response.json().catch(() => null)
  if (!body || typeof body !== 'object') return fallback

  const record = body as Record<string, unknown>
  return normalizeErrorMessage(record.error ?? record.message ?? record.errors, fallback)
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) return false

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        tokenStorage.clear()
        return false
      }

      const data = (await response.json()) as AuthTokens
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      tokenStorage.clear()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const isAuthEndpoint = endpoint.startsWith('/auth/')

  const buildHeaders = (): HeadersInit => ({
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...getAuthHeaders(),
    ...options.headers,
  })

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: buildHeaders(),
  })

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !isAuthEndpoint &&
    tokenStorage.getRefreshToken()
  ) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: buildHeaders(),
      })
    }
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function apiBlobDownload(endpoint: string, retryOnUnauthorized = true): Promise<Blob> {
  const isAuthEndpoint = endpoint.startsWith('/auth/')

  const buildHeaders = (): HeadersInit => ({
    ...getAuthHeaders(),
  })

  let response = await fetch(`${API_BASE}${endpoint}`, {
    headers: buildHeaders(),
  })

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !isAuthEndpoint &&
    tokenStorage.getRefreshToken()
  ) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await fetch(`${API_BASE}${endpoint}`, {
        headers: buildHeaders(),
      })
    }
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  const blob = await response.blob()
  const contentType = response.headers.get('Content-Type')?.split(';')[0]?.trim()
  if (contentType && !blob.type) {
    return new Blob([await blob.arrayBuffer()], { type: contentType })
  }
  return blob
}

export async function apiFormRequest<T>(
  endpoint: string,
  formData: FormData,
  retryOnUnauthorized = true
): Promise<T> {
  const isAuthEndpoint = endpoint.startsWith('/auth/')

  const buildHeaders = (): HeadersInit => ({
    ...getAuthHeaders(),
  })

  let response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers: buildHeaders(),
  })

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !isAuthEndpoint &&
    tokenStorage.getRefreshToken()
  ) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: buildHeaders(),
      })
    }
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  return response.json() as Promise<T>
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    ),

  register: (data: RegisterPayload) =>
    apiRequest<AuthResponse>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false
    ),

  me: () => apiRequest<MeResponse>('/auth/me'),

  updateMe: (data: UpdateProfilePayload) =>
    apiRequest<UpdateProfileResponse>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      false
    ),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{ message: string }>(
      '/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      },
      false
    ),

  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return apiFormRequest<AvatarUploadResponse>('/auth/avatar', formData)
  },

  deleteAvatar: () =>
    apiRequest<AvatarUploadResponse>('/auth/avatar', { method: 'DELETE' }),

  refresh: () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) {
      return Promise.reject(new ApiError('No refresh token', 401))
    }
    return apiRequest<AuthTokens>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      false
    )
  },

  logout: () => {
    const refreshToken = tokenStorage.getRefreshToken()
    return apiRequest<{ message: string }>(
      '/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      },
      false
    )
  },
}

export const organizationsApi = {
  list: () => apiRequest<OrganizationMembership[]>('/organizations'),

  get: (id: string) =>
    apiRequest<{ organization: OrganizationMembership['organization']; role: string }>(
      `/organizations/${id}`
    ),

  update: (id: string, data: { name: string }) =>
    apiRequest<{ organization: OrganizationMembership['organization'] }>(`/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  create: (name: string) =>
    apiRequest<AuthResponse & { membership: { organizationId: string; role: string } }>(
      '/organizations',
      { method: 'POST', body: JSON.stringify({ name }) },
      false
    ),

  listMembers: (id: string) => apiRequest<OrganizationMember[]>(`/organizations/${id}/members`),

  addMember: (id: string, email: string, role: string) =>
    apiRequest(`/organizations/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  updateMemberRole: (orgId: string, membershipId: string, role: string) =>
    apiRequest<{ member: OrganizationMember }>(`/organizations/${orgId}/members/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId: string, membershipId: string) =>
    apiRequest<{ message: string }>(`/organizations/${orgId}/members/${membershipId}`, {
      method: 'DELETE',
    }),

  switch: (id: string) =>
    apiRequest<AuthResponse>(
      `/organizations/${id}/switch`,
      { method: 'POST', body: JSON.stringify({}) },
      false
    ),
}

export const projectsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return apiRequest<Project[]>(`/projects${query}`)
  },
  get: (id: string) => apiRequest<Project>(`/projects/${id}`),
  create: (data: CreateProjectPayload) =>
    apiRequest<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateProjectPayload) =>
    apiRequest<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateTeam: (id: string, data: UpdateProjectTeamPayload) =>
    apiRequest<Project>(`/projects/${id}/team`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
}

export const tasksApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return apiRequest<Task[]>(`/tasks${query}`)
  },
  get: (id: string) => apiRequest<Task>(`/tasks/${id}`),
  create: (data: CreateTaskPayload) =>
    apiRequest<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTaskPayload) =>
    apiRequest<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
}

export const taskAttachmentsApi = {
  list: (taskId: string) => apiRequest<TaskAttachment[]>(`/tasks/${taskId}/attachments`),

  upload: (taskId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiFormRequest<TaskAttachment>(`/tasks/${taskId}/attachments`, formData)
  },

  delete: (taskId: string, attachmentId: string) =>
    apiRequest<{ message: string }>(`/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }),
}

export const commentsApi = {
  list: (params: Record<string, string>) => {
    const query = `?${new URLSearchParams(params)}`
    return apiRequest<Comment[]>(`/comments${query}`)
  },
  get: (id: string) => apiRequest<Comment>(`/comments/${id}`),
  create: (data: CreateCommentPayload) =>
    apiRequest<Comment>('/comments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateCommentPayload) =>
    apiRequest<Comment>(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<{ message: string }>(`/comments/${id}`, { method: 'DELETE' }),
}

export const activitiesApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return apiRequest<Activity[]>(`/activities${query}`)
  },
  get: (id: string) => apiRequest<Activity>(`/activities/${id}`),
}

export const notificationsApi = {
  list: () => apiRequest<NotificationsListResponse>('/notifications'),
  markRead: (id: string) =>
    apiRequest<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiRequest<{ message: string; updatedCount: number }>('/notifications/read-all', {
      method: 'PATCH',
    }),
}

export const dashboardApi = {
  get: () => apiRequest<DashboardResponse>('/dashboard'),
  stats: () => apiRequest<DashboardResponse>('/dashboard/stats'),
}

export const reportsApi = {
  get: (range: ReportRange = '30d') =>
    apiRequest<ReportsResponse>(`/reports?range=${range}`),
}

export const invitationsApi = {
  list: (orgId: string) => apiRequest<Invitation[]>(`/organizations/${orgId}/invitations`),

  create: (orgId: string, email: string, role: string) =>
    apiRequest<Invitation>(`/organizations/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  revoke: (orgId: string, invitationId: string) =>
    apiRequest<Invitation>(`/organizations/${orgId}/invitations/${invitationId}`, {
      method: 'DELETE',
    }),

  getByToken: (token: string) =>
    apiRequest<InvitationPreview>(`/invitations/${token}`, {}, false),

  accept: (token: string) =>
    apiRequest<AcceptInvitationResponse>(`/invitations/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
}

export const teamsApi = {
  list: (orgId: string) => apiRequest<Team[]>(`/organizations/${orgId}/teams`),

  create: (orgId: string, data: CreateTeamPayload) =>
    apiRequest<Team>(`/organizations/${orgId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (orgId: string, teamId: string, data: UpdateTeamPayload) =>
    apiRequest<Team>(`/organizations/${orgId}/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (orgId: string, teamId: string) =>
    apiRequest<{ message: string }>(`/organizations/${orgId}/teams/${teamId}`, {
      method: 'DELETE',
    }),

  listMembers: (orgId: string, teamId: string) =>
    apiRequest<TeamMembersResponse>(`/organizations/${orgId}/teams/${teamId}/members`),

  addMember: (orgId: string, teamId: string, userId: string) =>
    apiRequest<Team>(`/organizations/${orgId}/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeMember: (orgId: string, teamId: string, userId: string) =>
    apiRequest<Team>(`/organizations/${orgId}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    }),

  updateLead: (orgId: string, teamId: string, userId: string | null) =>
    apiRequest<Team>(`/organizations/${orgId}/teams/${teamId}/lead`, {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),
}

export const searchApi = {
  query: (q: string, limit = 5) => {
    const params = new URLSearchParams({ q, limit: String(limit) })
    return apiRequest<SearchResponse>(`/search?${params.toString()}`)
  },
}

function sendCommunicationMessage(
  endpoint: string,
  data: { content?: string; replyToMessageId?: string; mentions?: MessageMentionInput[] },
  file?: File
) {
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    if (data.content) formData.append('content', data.content)
    if (data.replyToMessageId) formData.append('replyToMessageId', data.replyToMessageId)
    if (data.mentions?.length) formData.append('mentions', JSON.stringify(data.mentions))
    return apiFormRequest<CommunicationMessage>(endpoint, formData)
  }
  return apiRequest<CommunicationMessage>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface MessageMentionInput {
  userId: string
  displayName: string
  start: number
  end: number
}

export const communicationApi = {
  getSidebar: () => apiRequest<CommunicationSidebarData>('/communication/sidebar'),
  getUnreadTotal: () => apiRequest<{ totalUnread: number }>('/communication/unread-total'),
  startDirect: (userId: string) =>
    apiRequest<{ id: string; participant: CommunicationMessage['sender'] }>('/communication/direct', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  listChannelMessages: (channelId: string, params?: { before?: string; limit?: number }) => {
    const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))}` : ''
    return apiRequest<MessagesPage>(`/communication/channels/${channelId}/messages${query}`)
  },
  getChannelMentionCandidates: (channelId: string) =>
    apiRequest<{
      members: {
        id: string
        firstName: string
        lastName: string
        email: string
        avatarUrl?: string
      }[]
    }>(`/communication/channels/${channelId}/mention-candidates`),
  listConversationMessages: (conversationId: string, params?: { before?: string; limit?: number }) => {
    const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))}` : ''
    return apiRequest<MessagesPage>(`/communication/conversations/${conversationId}/messages${query}`)
  },
  sendChannelMessage: (
    channelId: string,
    data: { content?: string; replyToMessageId?: string; mentions?: MessageMentionInput[] },
    file?: File
  ) => sendCommunicationMessage(`/communication/channels/${channelId}/messages`, data, file),
  sendConversationMessage: (
    conversationId: string,
    data: { content?: string; replyToMessageId?: string; mentions?: MessageMentionInput[] },
    file?: File
  ) => sendCommunicationMessage(`/communication/conversations/${conversationId}/messages`, data, file),
  editMessage: (
    messageId: string,
    data: { content: string; mentions?: MessageMentionInput[] }
  ) =>
    apiRequest<CommunicationMessage>(`/communication/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteMessage: (messageId: string) =>
    apiRequest<{ message: string; id: string }>(`/communication/messages/${messageId}`, {
      method: 'DELETE',
    }),
  downloadMessageAttachment: async (
    messageId: string,
    attachmentId: string,
    fileName: string
  ) => {
    const blob = await apiBlobDownload(
      `/communication/messages/${messageId}/attachments/${attachmentId}/download`
    )
    triggerFileDownload(blob, fileName, blob.type || undefined)
    return blob
  },
  fetchMessageAttachmentBlob: (messageId: string, attachmentId: string) =>
    apiBlobDownload(
      `/communication/messages/${messageId}/attachments/${attachmentId}/download`
    ),
  addReaction: (messageId: string, emoji: string) =>
    apiRequest<CommunicationMessage>(`/communication/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),
  removeReaction: (messageId: string, emoji: string) =>
    apiRequest<CommunicationMessage>(
      `/communication/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      { method: 'DELETE' }
    ),
  markChannelRead: (channelId: string, lastReadMessageId?: string) =>
    apiRequest<{ message: string }>(`/communication/channels/${channelId}/read`, {
      method: 'POST',
      body: JSON.stringify({ lastReadMessageId }),
    }),
  markConversationRead: (conversationId: string, lastReadMessageId?: string) =>
    apiRequest<{ message: string }>(`/communication/conversations/${conversationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ lastReadMessageId }),
    }),
  createChannel: (teamId: string, data: { name: string; description?: string }) =>
    apiRequest<{ id: string; name: string; slug: string }>(
      `/communication/teams/${teamId}/channels`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  updateChannel: (channelId: string, data: { name?: string; description?: string }) =>
    apiRequest<{ id: string; name: string; slug: string; description?: string; isGeneral: boolean }>(
      `/communication/channels/${channelId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  deleteChannel: (channelId: string) =>
    apiRequest<{ message: string }>(`/communication/channels/${channelId}`, {
      method: 'DELETE',
    }),
}
