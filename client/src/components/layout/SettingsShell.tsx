import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

/**
 * Deel-style settings layout: top bar only — no app sidebar.
 * Settings has its own internal left nav inside the white panel.
 */
export function SettingsShell() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#ebe4ff]">
      <TopBar />

      <div className="flex min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-1 sm:px-4 sm:pb-4 sm:pt-2 lg:px-5 lg:pb-5">
        <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_8px_40px_rgba(91,70,160,0.12)]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
