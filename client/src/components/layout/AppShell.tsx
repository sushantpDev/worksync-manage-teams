import { useState } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type AppShellContext = {
  mobileNavOpen: boolean
  setMobileNavOpen: (v: boolean) => void
}

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const isCommunication = location.pathname.startsWith('/communication')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface">
      <TopBar
        mobileNavOpen={mobileNavOpen}
        onMobileNavToggle={() => setMobileNavOpen(!mobileNavOpen)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        <main
          className={cn(
            'min-h-0 flex-1 overflow-x-hidden rounded-tl-2xl bg-content-panel sm:rounded-tl-[1.25rem]',
            isCommunication ? 'flex flex-col overflow-hidden p-0' : 'overflow-y-auto'
          )}
        >
          {isCommunication ? (
            <Outlet context={{ mobileNavOpen, setMobileNavOpen }} />
          ) : (
            <div className="px-6 pb-8 pt-5 sm:px-10 sm:pb-10 sm:pt-6">
              <Outlet context={{ mobileNavOpen, setMobileNavOpen }} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export function useAppShell() {
  return useOutletContext<AppShellContext>()
}
