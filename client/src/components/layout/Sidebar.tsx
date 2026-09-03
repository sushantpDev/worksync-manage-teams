import {
  BarChart3,
  BookOpen,
  CheckSquare,
  Contact2,
  FolderKanban,
  HelpCircle,
  Home,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCommunication } from '../../context/CommunicationContext'
import { canViewReports } from '../../lib/permissions'
import { cn } from '../../lib/utils'

const mainNav = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/people', icon: Contact2, label: 'People' },
  { to: '/communication', icon: MessageSquare, label: 'Communication', badge: true },
]

const secondaryNav = [
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
]

function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon
      className="h-[18px] w-[18px] shrink-0 text-black"
      strokeWidth={2}
    />
  )
}

function navItemClasses(collapsed: boolean, isActive = false) {
  return cn(
    'flex items-center rounded-lg py-2.5 text-[13px] font-medium text-black transition-all',
    collapsed ? 'justify-center px-2' : 'gap-3 px-3',
    isActive ? 'bg-card shadow-sm' : 'hover:bg-white/50'
  )
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: {
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { user } = useAuth()
  const { totalUnread: communicationUnread } = useCommunication()
  const showReports = canViewReports(user?.role)

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          'z-50 flex shrink-0 flex-col bg-surface transition-[width,transform] duration-200',
          'fixed inset-y-0 left-0 top-14 lg:static lg:h-full lg:translate-x-0',
          collapsed ? 'w-[56px]' : 'w-[240px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              end={item.to === '/dashboard'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => navItemClasses(collapsed, isActive)}
            >
              <NavIcon icon={item.icon} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.badge && communicationUnread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-purple px-1.5 text-[10px] font-semibold text-white">
                  {communicationUnread > 99 ? '99+' : communicationUnread}
                </span>
              )}
            </NavLink>
          ))}

          {showReports && (
            <NavLink
              to="/reports"
              onClick={onMobileClose}
              title={collapsed ? 'Reports' : undefined}
              className={({ isActive }) => navItemClasses(collapsed, isActive)}
            >
              <NavIcon icon={BarChart3} />
              {!collapsed && <span className="flex-1">Reports</span>}
            </NavLink>
          )}

          <NavLink
            to="/settings"
            onClick={onMobileClose}
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) => navItemClasses(collapsed, isActive)}
          >
            <NavIcon icon={Settings} />
            {!collapsed && <span className="flex-1">Settings</span>}
          </NavLink>

          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => navItemClasses(collapsed, isActive)}
            >
              <NavIcon icon={item.icon} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </NavLink>
          ))}

          <NavLink
            to="/help"
            onClick={onMobileClose}
            title={collapsed ? 'Help' : undefined}
            className={({ isActive }) => navItemClasses(collapsed, isActive)}
          >
            <NavIcon icon={HelpCircle} />
            {!collapsed && <span className="flex-1">Help</span>}
          </NavLink>
        </nav>

        <div className="hidden shrink-0 px-2 pb-4 lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-black transition-colors hover:bg-white/50"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

export function MobileNavToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-9 w-9 items-center justify-center rounded-full text-black transition-colors hover:bg-white/50 lg:hidden"
      aria-label="Toggle navigation"
    >
      {open ? <X className="h-4 w-4" strokeWidth={2} /> : <Menu className="h-4 w-4" strokeWidth={2} />}
    </button>
  )
}
