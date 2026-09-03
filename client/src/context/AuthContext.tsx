import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Organization, User, UserRole } from '../types'
import type { MeResponse, OrganizationMembership, RegisterPayload } from '../types/auth'
import { ApiError, authApi, organizationsApi, refreshAccessToken } from '../lib/api'
import { orgStorage } from '../lib/orgStorage'
import { tokenStorage } from '../lib/tokenStorage'

interface AuthContextValue {
  user: User | null
  organization: Organization | null
  organizations: OrganizationMembership[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  createOrganization: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applyOrgContext(user: User, organization: Organization | null) {
  if (organization?.id) {
    orgStorage.setOrganizationId(organization.id)
  }
  return {
    user: {
      ...user,
      organizationId: organization?.id ?? user.organizationId,
    },
    organization,
  }
}

function mapMeResponse(data: MeResponse): {
  user: User
  organization: Organization | null
  organizations: OrganizationMembership[]
} {
  const user: User = {
    id: data.id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    avatarUrl: data.avatarUrl,
    role: data.role,
    organizationId: data.organizationId,
  }

  return {
    user,
    organization: data.organization,
    organizations: data.organizations ?? [],
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const applySession = useCallback(
    (
      nextUser: User,
      nextOrganization: Organization | null,
      nextOrganizations: OrganizationMembership[] = []
    ) => {
      const ctx = applyOrgContext(nextUser, nextOrganization)
      setUser(ctx.user)
      setOrganization(ctx.organization)
      setOrganizations(nextOrganizations)
    },
    []
  )

  const clearSession = useCallback(() => {
    tokenStorage.clear()
    orgStorage.clear()
    setUser(null)
    setOrganization(null)
    setOrganizations([])
  }, [])

  const loadCurrentUser = useCallback(async () => {
    if (!tokenStorage.hasSession()) {
      clearSession()
      return
    }

    try {
      const me = await authApi.me()
      const mapped = mapMeResponse(me)
      applySession(mapped.user, mapped.organization, mapped.organizations)
      return
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && tokenStorage.getRefreshToken()) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          const me = await authApi.me()
          const mapped = mapMeResponse(me)
          applySession(mapped.user, mapped.organization, mapped.organizations)
          return
        }
      }
      clearSession()
    }
  }, [applySession, clearSession])

  useEffect(() => {
    loadCurrentUser().finally(() => setIsLoading(false))
  }, [loadCurrentUser])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password)
      tokenStorage.setTokens(response.accessToken, response.refreshToken)
      applySession(
        response.user as User,
        response.organization ?? null,
        response.organization
          ? [{ organization: response.organization, role: (response.user.role ?? 'member') as UserRole }]
          : []
      )

      await loadCurrentUser()
    },
    [applySession, loadCurrentUser]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await authApi.register(payload)
      tokenStorage.setTokens(response.accessToken, response.refreshToken)
      applySession(
        response.user as User,
        response.organization ?? null,
        response.organization
          ? [{ organization: response.organization, role: (response.user.role ?? 'admin') as UserRole }]
          : []
      )
    },
    [applySession]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      clearSession()
    }
  }, [clearSession])

  const refreshSession = useCallback(async () => {
    await loadCurrentUser()
  }, [loadCurrentUser])

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const response = await organizationsApi.switch(organizationId)
      tokenStorage.setTokens(response.accessToken, response.refreshToken)
      applySession(response.user as User, response.organization ?? null, organizations)
      await loadCurrentUser()
    },
    [applySession, loadCurrentUser, organizations]
  )

  const createOrganization = useCallback(
    async (name: string) => {
      const response = await organizationsApi.create(name)
      tokenStorage.setTokens(response.accessToken, response.refreshToken)
      await loadCurrentUser()
    },
    [loadCurrentUser]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      organization,
      organizations,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      switchOrganization,
      createOrganization,
    }),
    [
      user,
      organization,
      organizations,
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      switchOrganization,
      createOrganization,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
