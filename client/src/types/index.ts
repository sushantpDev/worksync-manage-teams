export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'task_created'
  | 'task_assigned'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'
  | 'status_changed'
  | 'task_priority_changed'
  | 'member_added'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role?: UserRole
  organizationId?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: string
}

export interface Team {
  id: string
  name: string
  description?: string
  organizationId: string
  memberIds: string[]
  members?: ProjectUserSummary[]
  leadId?: string
  lead?: ProjectUserSummary | null
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface Invitation {
  id: string
  organizationId: string
  email: string
  role: UserRole
  invitedBy: string
  status: InvitationStatus
  expiresAt: string
  createdAt: string
}

export interface InvitationPreview {
  id: string
  email: string
  role: UserRole
  status: InvitationStatus
  expiresAt: string
  organization: { id: string; name: string } | null
  inviter: { firstName: string; lastName: string } | null
}

export interface AcceptInvitationResponse {
  message: string
  membership: { organizationId: string; role: UserRole }
  organization: Organization | null
  accessToken: string
}

export interface CreateTeamPayload {
  name: string
  description?: string
  memberIds?: string[]
  leadId?: string
}

export interface UpdateTeamPayload {
  name?: string
  description?: string
  memberIds?: string[]
  leadId?: string | null
}

export interface TeamMemberRow {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string
  isLead: boolean
}

export interface TeamMembersResponse {
  teamId: string
  leadId: string | null
  members: TeamMemberRow[]
}

export interface ProjectUserSummary {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
}

export interface ProjectTeamSummary {
  id: string
  name: string
  memberIds?: string[]
}

export interface Project {
  id: string
  name: string
  description: string
  organizationId: string
  ownerId: string
  owner?: ProjectUserSummary | null
  teamIds: string[]
  teams?: ProjectTeamSummary[]
  status: ProjectStatus
  progress: number
  startDate: string
  dueDate: string
  taskCount: number
  completedTaskCount: number
  memberIds: string[]
  members?: ProjectUserSummary[]
  createdBy?: string
  updatedAt: string
  createdAt: string
}

export interface CreateProjectPayload {
  name: string
  description?: string
  startDate: string
  dueDate: string
  status?: ProjectStatus
  memberIds?: string[]
  teamIds?: string[]
  progress?: number
}

export interface UpdateProjectPayload {
  name?: string
  description?: string
  startDate?: string
  dueDate?: string
  status?: ProjectStatus
  memberIds?: string[]
  teamIds?: string[]
  progress?: number
  ownerId?: string
}

export interface UpdateProjectTeamPayload {
  teamIds: string[]
  memberIds: string[]
}

export interface Task {
  id: string
  projectId: string
  organizationId?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string
  assignee?: ProjectUserSummary | null
  dueDate?: string
  labels: string[]
  commentCount: number
  attachmentCount: number
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  membershipId?: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: UserRole
  joinedAt?: string
}

export interface CreateTaskPayload {
  projectId: string
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  dueDate?: string
  labels?: string[]
}

export interface UpdateTaskPayload {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string
  projectId?: string
  labels?: string[]
}

export interface Comment {
  id: string
  organizationId?: string
  projectId: string
  taskId?: string
  authorId: string
  userId?: string
  author?: ProjectUserSummary | null
  content: string
  createdAt: string
  updatedAt?: string
}

export interface CreateCommentPayload {
  projectId: string
  taskId?: string
  content: string
}

export interface UpdateCommentPayload {
  content: string
}

export interface TaskAttachment {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  size: number
  uploadedBy?: ProjectUserSummary | null
  createdAt: string
}

export interface CommunicationChannelSummary {
  id: string
  teamId: string
  name: string
  slug: string
  description?: string
  isGeneral: boolean
  unreadCount: number
}

export interface CommunicationTeamSummary {
  id: string
  name: string
  channels: CommunicationChannelSummary[]
}

export interface DirectMessageSummary {
  id: string
  participant: ProjectUserSummary | null
  lastMessagePreview: string
  lastMessageAt: string | null
  unreadCount: number
}

export interface CommunicationSidebarData {
  teams: CommunicationTeamSummary[]
  directMessages: DirectMessageSummary[]
  totalUnread: number
}

export interface MessageAttachmentMeta {
  _id?: string
  fileName: string
  fileUrl: string
  publicId: string
  resourceType: 'image' | 'raw'
  mimeType: string
  size: number
}

export interface MessageReactionGroup {
  emoji: string
  count: number
  users: { id: string; firstName: string; lastName: string }[]
  reactedByMe?: boolean
}

export interface MessageReplyPreview {
  id: string
  content: string
  deletedAt: string | null
  sender: ProjectUserSummary | null
}

export interface MessageMention {
  userId: string
  name: string
  avatarUrl?: string
  start: number
  end: number
}

export interface CommunicationMessage {
  id: string
  contextType: 'channel' | 'direct'
  channelId?: string
  conversationId?: string
  content: string
  sender: ProjectUserSummary | null
  replyTo: MessageReplyPreview | null
  mentions: MessageMention[]
  attachments: MessageAttachmentMeta[]
  reactions: MessageReactionGroup[]
  readReceipt?: 'sent' | 'read'
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
}

export interface MessagesPage {
  messages: CommunicationMessage[]
  nextCursor: string | null
}

export type CommunicationSelection =
  | {
      type: 'channel'
      channelId: string
      teamId: string
      title: string
      slug: string
      isGeneral: boolean
      description?: string
    }
  | {
      type: 'direct'
      conversationId: string
      title: string
      participant: ProjectUserSummary | null
    }

export interface TypingUserIdentity {
  userId: string
  firstName: string
  lastName: string
  avatarUrl?: string
}

export interface CommunicationAccessRevokedPayload {
  reason: 'team_removed' | 'membership_removed'
  contextType: 'channel' | 'organization'
  teamId?: string
  channelIds?: string[]
  organizationId?: string
}

export interface Notification {
  id: string
  organizationId?: string
  userId: string
  type: 'message' | 'task' | 'project' | 'system' | 'communication_mention'
  title: string
  message: string
  projectId?: string
  taskId?: string
  communicationContextType?: 'channel' | 'direct'
  channelId?: string
  conversationId?: string
  messageId?: string
  teamId?: string
  isRead: boolean
  read?: boolean
  createdAt: string
}

export interface NotificationsListResponse {
  notifications: Notification[]
  unreadCount: number
}

export interface Activity {
  id: string
  organizationId?: string
  projectId?: string
  taskId?: string
  type: ActivityType
  actorId: string
  actor?: ProjectUserSummary | null
  message?: string
  description?: string
  metadata?: Record<string, string>
  createdAt: string
}

export interface DashboardKpi {
  label: string
  value: string
  trendLabel: string
  sparkline: number[]
  variant: 'yellow' | 'green' | 'orange' | 'blue'
}

export interface DashboardProjectSummary {
  id: string
  name: string
  status: string
  progress: number
  updatedAt: string
}

export interface DashboardResponse {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  overallProjectProgress: number
  recentProjects: DashboardProjectSummary[]
  projectProgressList: DashboardProjectSummary[]
  myTasks: Task[]
  recentActivities: Activity[]
  unreadNotificationCount: number
  activityChart: {
    '7D': ChartDataPoint[]
    '30D': ChartDataPoint[]
    '90D': ChartDataPoint[]
  }
  kpis: DashboardKpi[]
}

export interface ChartDataPoint {
  date: string
  label: string
  completed: number
  created: number
  updated: number
}

export type ReportRange = '7d' | '30d' | '90d'

export interface ReportsOverview {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  completionRate: number
}

export interface ReportProjectPerformance {
  projectId: string
  name: string
  status: ProjectStatus
  progress: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  dueDate: string | null
}

export interface ReportStatusCount {
  status: TaskStatus
  count: number
}

export interface ReportPriorityCount {
  priority: TaskPriority
  count: number
}

export interface ReportCompletionTrendPoint {
  date: string
  label: string
  count: number
}

export interface ReportTeamWorkloadRow {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  role: UserRole
  assignedTasks: number
  inProgress: number
  inReview: number
  completed: number
  overdue: number
}

export interface ReportsResponse {
  range: ReportRange
  overview: ReportsOverview
  projectPerformance: ReportProjectPerformance[]
  tasksByStatus: ReportStatusCount[]
  tasksByPriority: ReportPriorityCount[]
  completionTrend: ReportCompletionTrendPoint[]
  teamWorkload: ReportTeamWorkloadRow[]
}

export interface RecentActivityItem {
  id: string
  actorId: string
  actor?: ProjectUserSummary | null
  message: string
  highlight?: string
  createdAt: string
  icon: 'check' | 'message' | 'assign' | 'upload' | 'status'
}

export interface SearchProjectResult {
  id: string
  name: string
  status: ProjectStatus
  dueDate: string
  owner?: ProjectUserSummary | null
}

export interface SearchTaskResult {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  projectName: string
  assignee?: ProjectUserSummary | null
}

export interface SearchPersonResult {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string
  role: UserRole
}

export interface SearchResponse {
  projects: SearchProjectResult[]
  tasks: SearchTaskResult[]
  people: SearchPersonResult[]
}
