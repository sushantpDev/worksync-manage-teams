import type { Organization, User, UserRole } from './index'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface OrganizationMembership {
  organization: Organization
  role: UserRole
  membershipId?: string
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    avatarUrl?: string
    role?: UserRole
    organizationId?: string
  }
  organization?: Organization | null
}

export interface MeResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role?: UserRole
  organizationId?: string
  organization: Organization | null
  organizations: OrganizationMembership[]
}

export interface RegisterPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName?: string
}

export interface UpdateProfilePayload {
  firstName?: string
  lastName?: string
  email?: string
  avatarUrl?: string | null
}

export interface UpdateProfileResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    avatarUrl?: string
    role?: UserRole
    organizationId?: string
  }
  accessToken?: string
  refreshToken?: string
}

export interface AvatarUploadResponse {
  avatarUrl: string | null
  user: UpdateProfileResponse['user']
}

export interface AuthState {
  user: User | null
  organization: Organization | null
  isAuthenticated: boolean
  isLoading: boolean
}
