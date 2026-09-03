import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  Building2,
  LayoutGrid,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ProfilePhotoControl } from '../components/profile/ProfilePhotoControl'
import { RolesPermissionsPanel } from '../components/settings/RolesPermissionsPanel'
import { TeamsSettingsPanel } from '../components/settings/TeamsSettingsPanel'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { ApiError, authApi, organizationsApi } from '../lib/api'
import { canManageOrganization } from '../lib/permissions'
import { tokenStorage } from '../lib/tokenStorage'
import { isValidEmail, isValidPassword, normalizeEmail } from '../lib/validation'
import { cn } from '../lib/utils'

type SettingsSectionId =
  | 'main'
  | 'profile'
  | 'security'
  | 'organization'
  | 'roles'
  | 'teams'
  | 'notifications'

const fieldClass =
  'mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827] transition-colors placeholder:text-[#9ca3af] focus:border-[#93c5fd] focus:outline-none focus:ring-4 focus:ring-[#dbeafe] disabled:opacity-60'

const readOnlyFieldClass =
  'mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#4b5563]'

function roleLabel(role?: string) {
  if (!role) return 'Member'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function Feedback({
  type,
  message,
}: {
  type: 'success' | 'error'
  message: string
}) {
  return (
    <div
      className={
        type === 'success'
          ? 'rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800'
          : 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
      }
    >
      {message}
    </div>
  )
}

const navGroups: {
  label: string | null
  items: { id: SettingsSectionId; label: string; icon: LucideIcon }[]
}[] = [
  {
    label: null,
    items: [{ id: 'main', label: 'Main settings', icon: LayoutGrid }],
  },
  {
    label: 'Organization & security',
    items: [
      { id: 'organization', label: 'Organization', icon: Building2 },
      { id: 'security', label: 'Security', icon: ShieldCheck },
      { id: 'roles', label: 'Roles and permissions', icon: UserPlus },
      { id: 'teams', label: 'Teams', icon: Users },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: UserRound },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
]

const quickAccessCards: {
  id: SettingsSectionId
  title: string
  description: string
  icon: LucideIcon
}[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Update your name, email, and profile photo.',
    icon: UserRound,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Change your password and keep account access protected.',
    icon: LockKeyhole,
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'Manage workspace identity and your access level.',
    icon: Building2,
  },
  {
    id: 'roles',
    title: 'Roles and permissions',
    description: 'Manage roles, permissions, managers and admins for your organization.',
    icon: UserPlus,
  },
  {
    id: 'teams',
    title: 'Teams',
    description: 'Define how your organization is structured across WorkSync.',
    icon: Users,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Choose which workspace updates should reach you.',
    icon: Bell,
  },
]

function QuickAccessCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string
  description: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full cursor-pointer flex-col rounded-xl border border-[#e5e7eb] bg-white p-5 text-left transition-colors hover:border-[#d1d5db] hover:bg-[#fafbfc]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c7e2fe] text-black">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </span>
      <h3 className="mt-4 text-[15px] font-medium text-[#1f74b3]">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-5 text-[#6b7280]">{description}</p>
    </button>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { organization, user, refreshSession, logout } = useAuth()

  const canEditOrganization = canManageOrganization(user?.role)
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('main')
  const [settingsSearch, setSettingsSearch] = useState('')
  const [settingsNavCollapsed, setSettingsNavCollapsed] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [orgName, setOrgName] = useState('')
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgFeedback, setOrgFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName)
    setLastName(user.lastName)
    setEmail(user.email)
  }, [user])

  useEffect(() => {
    setOrgName(organization?.name ?? '')
  }, [organization?.id, organization?.name])

  const filteredNavGroups = useMemo(() => {
    const q = settingsSearch.trim().toLowerCase()
    if (!q) return navGroups
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0)
  }, [settingsSearch])

  const filteredQuickCards = useMemo(() => {
    const q = settingsSearch.trim().toLowerCase()
    if (!q) return quickAccessCards
    return quickAccessCards.filter(
      (card) =>
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q)
    )
  }, [settingsSearch])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileFeedback(null)

    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const normalizedEmail = normalizeEmail(email)

    if (!trimmedFirst) {
      setProfileFeedback({ type: 'error', message: 'First name is required' })
      return
    }
    if (!trimmedLast) {
      setProfileFeedback({ type: 'error', message: 'Last name is required' })
      return
    }
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setProfileFeedback({ type: 'error', message: 'Enter a valid email address' })
      return
    }

    setProfileSaving(true)

    try {
      const response = await authApi.updateMe({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: normalizedEmail,
      })

      if (response.accessToken && response.refreshToken) {
        tokenStorage.setTokens(response.accessToken, response.refreshToken)
      }

      await refreshSession()
      setProfileFeedback({ type: 'success', message: 'Profile updated successfully.' })
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to update profile',
      })
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordFeedback(null)

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Current password is required' })
      return
    }
    if (!newPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password is required' })
      return
    }
    if (!confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please confirm your new password' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match' })
      return
    }
    if (!isValidPassword(newPassword)) {
      setPasswordFeedback({ type: 'error', message: 'Password must be at least 8 characters' })
      return
    }

    setPasswordSaving(true)

    try {
      const response = await authApi.changePassword(currentPassword, newPassword)
      await logout()
      navigate('/login', {
        replace: true,
        state: { message: response.message },
      })
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to change password',
      })
      setPasswordSaving(false)
    }
  }

  async function handleOrganizationSave(e: React.FormEvent) {
    e.preventDefault()
    setOrgFeedback(null)

    if (!organization?.id) return

    const trimmed = orgName.trim()
    if (!trimmed) {
      setOrgFeedback({ type: 'error', message: 'Organization name is required' })
      return
    }
    if (trimmed.length > 120) {
      setOrgFeedback({
        type: 'error',
        message: 'Organization name must be 120 characters or fewer',
      })
      return
    }

    setOrgSaving(true)

    try {
      await organizationsApi.update(organization.id, { name: trimmed })
      await refreshSession()
      setOrgFeedback({ type: 'success', message: 'Organization updated successfully.' })
    } catch (err) {
      setOrgFeedback({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to update organization',
      })
    } finally {
      setOrgSaving(false)
    }
  }

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User'

  function openSection(id: SettingsSectionId) {
    setActiveSection(id)
  }

  return (
    <div className="relative flex min-h-0 w-full flex-1 overflow-hidden">
      {/* Close settings → back to app */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        aria-label="Close settings"
        className="absolute right-4 top-4 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#e8e8e8] text-[#111827] transition-colors hover:bg-[#dcdcdc]"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </button>

      {/* Settings-only left nav (Deel-style) */}
      <aside
        className={cn(
          'relative hidden shrink-0 flex-col rounded-l-2xl border-r border-[#ebebeb] bg-[#fafafa] transition-[width] duration-200 lg:flex',
          settingsNavCollapsed ? 'w-[72px]' : 'w-[280px]'
        )}
      >
        <div className={cn('pb-3 pt-6', settingsNavCollapsed ? 'px-3' : 'px-4')}>
          {!settingsNavCollapsed && (
            <h2 className="mb-4 px-1 text-[1.2rem] font-bold tracking-tight text-black">
              All Settings
            </h2>
          )}

          {!settingsNavCollapsed ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
              <input
                type="search"
                value={settingsSearch}
                onChange={(e) => setSettingsSearch(e.target.value)}
                placeholder="Search setting"
                className="h-10 w-full rounded-full border border-[#e0e0e0] bg-white pl-10 pr-4 text-[13px] text-black outline-none placeholder:text-[#9a9a9a] focus:border-[#cfcfcf]"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSettingsNavCollapsed(false)}
              aria-label="Expand settings navigation"
              className="mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-black hover:bg-[#fafafa]"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 overflow-y-auto pb-14 pt-2',
            settingsNavCollapsed ? 'px-2' : 'px-3'
          )}
        >
          {filteredNavGroups.map((group, groupIndex) => (
            <div key={group.label ?? `group-${groupIndex}`} className="mb-5">
              {group.label && !settingsNavCollapsed && (
                <p className="mb-1.5 px-3 text-[13px] font-normal text-[#707070]">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = activeSection === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        title={settingsNavCollapsed ? item.label : undefined}
                        onClick={() => openSection(item.id)}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-2.5 rounded-xl text-left text-black transition-colors',
                          settingsNavCollapsed
                            ? 'justify-center px-0 py-2.5'
                            : 'px-3 py-2.5',
                          active
                            ? 'bg-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                            : 'font-normal hover:bg-white/90'
                        )}
                      >
                        <Icon
                          className="h-[18px] w-[18px] shrink-0 text-black"
                          strokeWidth={1.75}
                        />
                        {!settingsNavCollapsed && (
                          <span className="text-[14px] leading-snug text-black">
                            {item.label}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setSettingsNavCollapsed((v) => !v)}
          aria-label={settingsNavCollapsed ? 'Expand settings sidebar' : 'Collapse settings sidebar'}
          className="absolute bottom-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-black transition-colors hover:bg-white"
        >
          {settingsNavCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </aside>

        {/* Mobile section picker */}
        <div className="flex w-full flex-col lg:hidden">
          <div className="border-b border-[#ececec] px-4 py-3">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="search"
                value={settingsSearch}
                onChange={(e) => setSettingsSearch(e.target.value)}
                placeholder="Search setting"
                className="h-10 w-full rounded-full border border-[#e0e0e0] bg-white pl-10 pr-4 text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#9ca3af] focus:border-[#cfcfcf] focus:bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {navGroups.flatMap((g) => g.items).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSection(item.id)}
                  className={cn(
                    'shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium',
                    activeSection === item.id
                      ? 'bg-[#111827] text-white'
                      : 'bg-[#f3f4f6] text-[#4b5563]'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <SettingsContent
              activeSection={activeSection}
              filteredQuickCards={filteredQuickCards}
              onOpenSection={openSection}
              displayName={displayName}
              user={user}
              organization={organization}
              canEditOrganization={canEditOrganization}
              firstName={firstName}
              lastName={lastName}
              email={email}
              setFirstName={setFirstName}
              setLastName={setLastName}
              setEmail={setEmail}
              profileSaving={profileSaving}
              profileFeedback={profileFeedback}
              onProfileSave={handleProfileSave}
              onRefreshSession={refreshSession}
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              setCurrentPassword={setCurrentPassword}
              setNewPassword={setNewPassword}
              setConfirmPassword={setConfirmPassword}
              passwordSaving={passwordSaving}
              passwordFeedback={passwordFeedback}
              onPasswordChange={handlePasswordChange}
              orgName={orgName}
              setOrgName={setOrgName}
              orgSaving={orgSaving}
              orgFeedback={orgFeedback}
              onOrganizationSave={handleOrganizationSave}
            />
          </div>
        </div>

        {/* Desktop main panel */}
        <main className="relative hidden min-w-0 flex-1 overflow-y-auto lg:block">
          <div className="px-6 py-8 sm:px-8 xl:px-10 xl:py-10">
            <SettingsContent
              activeSection={activeSection}
              filteredQuickCards={filteredQuickCards}
              onOpenSection={openSection}
              displayName={displayName}
              user={user}
              organization={organization}
              canEditOrganization={canEditOrganization}
              firstName={firstName}
              lastName={lastName}
              email={email}
              setFirstName={setFirstName}
              setLastName={setLastName}
              setEmail={setEmail}
              profileSaving={profileSaving}
              profileFeedback={profileFeedback}
              onProfileSave={handleProfileSave}
              onRefreshSession={refreshSession}
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              setCurrentPassword={setCurrentPassword}
              setNewPassword={setNewPassword}
              setConfirmPassword={setConfirmPassword}
              passwordSaving={passwordSaving}
              passwordFeedback={passwordFeedback}
              onPasswordChange={handlePasswordChange}
              orgName={orgName}
              setOrgName={setOrgName}
              orgSaving={orgSaving}
              orgFeedback={orgFeedback}
              onOrganizationSave={handleOrganizationSave}
            />
          </div>
        </main>
    </div>
  )
}

function SettingsContent({
  activeSection,
  filteredQuickCards,
  onOpenSection,
  displayName,
  user,
  organization,
  canEditOrganization,
  firstName,
  lastName,
  email,
  setFirstName,
  setLastName,
  setEmail,
  profileSaving,
  profileFeedback,
  onProfileSave,
  onRefreshSession,
  currentPassword,
  newPassword,
  confirmPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  passwordSaving,
  passwordFeedback,
  onPasswordChange,
  orgName,
  setOrgName,
  orgSaving,
  orgFeedback,
  onOrganizationSave,
}: {
  activeSection: SettingsSectionId
  filteredQuickCards: typeof quickAccessCards
  onOpenSection: (id: SettingsSectionId) => void
  displayName: string
  user: ReturnType<typeof useAuth>['user']
  organization: ReturnType<typeof useAuth>['organization']
  canEditOrganization: boolean
  firstName: string
  lastName: string
  email: string
  setFirstName: (v: string) => void
  setLastName: (v: string) => void
  setEmail: (v: string) => void
  profileSaving: boolean
  profileFeedback: { type: 'success' | 'error'; message: string } | null
  onProfileSave: (e: React.FormEvent) => void
  onRefreshSession: () => Promise<void>
  currentPassword: string
  newPassword: string
  confirmPassword: string
  setCurrentPassword: (v: string) => void
  setNewPassword: (v: string) => void
  setConfirmPassword: (v: string) => void
  passwordSaving: boolean
  passwordFeedback: { type: 'success' | 'error'; message: string } | null
  onPasswordChange: (e: React.FormEvent) => void
  orgName: string
  setOrgName: (v: string) => void
  orgSaving: boolean
  orgFeedback: { type: 'success' | 'error'; message: string } | null
  onOrganizationSave: (e: React.FormEvent) => void
}) {
  if (activeSection === 'main') {
    return (
      <div className="mx-auto max-w-[920px]">
        <div className="mb-8 text-center">
          <h1 className="text-[1.65rem] font-bold tracking-tight text-[#111827] sm:text-[1.85rem]">
            Quick access to main settings
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-[#6b7280]">
            We&apos;ve curated the most commonly used so you can find what you need - fast
          </p>
        </div>

        {filteredQuickCards.length === 0 ? (
          <p className="text-center text-sm text-[#6b7280]">No settings match your search.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredQuickCards.map((card) => (
              <QuickAccessCard
                key={card.id}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => onOpenSection(card.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeSection === 'roles') {
    return <RolesPermissionsPanel onBack={() => onOpenSection('main')} />
  }

  if (activeSection === 'teams') {
    return <TeamsSettingsPanel onBack={() => onOpenSection('main')} />
  }

  if (activeSection === 'profile') {
    return (
      <DetailPanel
        title="Profile"
        description="Update your name, email, and profile photo."
        onBack={() => onOpenSection('main')}
      >
        <form onSubmit={onProfileSave} className="space-y-5">
          {profileFeedback && (
            <Feedback type={profileFeedback.type} message={profileFeedback.message} />
          )}

          <ProfilePhotoControl
            userId={user?.id}
            name={displayName}
            avatarUrl={user?.avatarUrl}
            onUpdated={onRefreshSession}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[#6b7280]">First name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280]">Last name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[#6b7280]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" disabled={profileSaving}>
              <Save className="h-4 w-4" />
              {profileSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DetailPanel>
    )
  }

  if (activeSection === 'security') {
    return (
      <DetailPanel
        title="Security"
        description="Change your password and keep account access protected."
        onBack={() => onOpenSection('main')}
      >
        <form onSubmit={onPasswordChange} className="space-y-5">
          {passwordFeedback && (
            <Feedback type={passwordFeedback.type} message={passwordFeedback.message} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[#6b7280]">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280]">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280]">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>
          </div>

          <p className="rounded-xl bg-[#f9fafb] px-4 py-3 text-xs text-[#6b7280]">
            Password must be at least 8 characters.
          </p>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" disabled={passwordSaving}>
              {passwordSaving ? 'Changing...' : 'Change password'}
            </Button>
          </div>
        </form>
      </DetailPanel>
    )
  }

  if (activeSection === 'organization') {
    return (
      <DetailPanel
        title="Organization"
        description="Manage workspace identity and your access level."
        onBack={() => onOpenSection('main')}
      >
        {canEditOrganization ? (
          <form onSubmit={onOrganizationSave} className="space-y-5">
            {orgFeedback && <Feedback type={orgFeedback.type} message={orgFeedback.message} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[#6b7280]">Organization name</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280]">Plan</label>
                <input
                  type="text"
                  value={organization?.plan ?? '-'}
                  readOnly
                  aria-readonly="true"
                  className={`${readOnlyFieldClass} capitalize`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280]">Your role</label>
                <input
                  type="text"
                  value={roleLabel(user?.role)}
                  readOnly
                  aria-readonly="true"
                  className={readOnlyFieldClass}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" disabled={orgSaving}>
                <Save className="h-4 w-4" />
                {orgSaving ? 'Saving...' : 'Save organization'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[#6b7280]">Organization name</label>
              <input
                type="text"
                value={organization?.name ?? '-'}
                readOnly
                aria-readonly="true"
                className={readOnlyFieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280]">Plan</label>
              <input
                type="text"
                value={organization?.plan ?? '-'}
                readOnly
                aria-readonly="true"
                className={`${readOnlyFieldClass} capitalize`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280]">Your role</label>
              <input
                type="text"
                value={roleLabel(user?.role)}
                readOnly
                aria-readonly="true"
                className={readOnlyFieldClass}
              />
            </div>
          </div>
        )}
      </DetailPanel>
    )
  }

  return (
    <DetailPanel
      title="Notifications"
      description="Choose which workspace updates should reach you."
      onBack={() => onOpenSection('main')}
    >
      <div className="max-w-xl space-y-3 opacity-70">
        {['Email notifications', 'Task assignments', 'Project updates', 'Weekly digest'].map(
          (label) => (
            <label
              key={label}
              className="flex cursor-not-allowed items-center justify-between rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3"
            >
              <span className="text-sm text-[#6b7280]">{label}</span>
              <input
                type="checkbox"
                disabled
                defaultChecked
                className="h-4 w-4 cursor-not-allowed rounded"
              />
            </label>
          )
        )}
        <p className="pt-1 text-xs text-[#9ca3af]">Notification preferences coming soon.</p>
      </div>
    </DetailPanel>
  )
}

function DetailPanel({
  title,
  description,
  onBack,
  children,
}: {
  title: string
  description: string
  onBack: () => void
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex cursor-pointer items-center gap-2 text-[15px] font-normal text-[#111827] transition-opacity hover:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Back to main settings
      </button>
      <div className="mb-8">
        <h1 className="text-[1.65rem] font-bold tracking-tight text-[#111827]">{title}</h1>
        <p className="mt-2 text-[15px] text-[#6b7280]">{description}</p>
      </div>
      {children}
    </div>
  )
}
