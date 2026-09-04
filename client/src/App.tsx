import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute } from './components/auth/GuestRoute'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { SettingsShell } from './components/layout/SettingsShell'
import { DashboardPage } from './pages/DashboardPage'
import { HelpPage } from './pages/HelpPage'
import { LoginPage } from './pages/LoginPage'
import { ReportsPage } from './pages/ReportsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ProjectDetailsPage } from './pages/ProjectDetailsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'
import { TaskDetailsPage } from './pages/TaskDetailsPage'
import { TeamPage } from './pages/TeamPage'
import { PeoplePage } from './pages/PeoplePage'
import { CommunicationPage } from './pages/CommunicationPage'
import { InviteAcceptPage } from './pages/InviteAcceptPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { KnowledgePage } from './pages/KnowledgePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/product" element={<Navigate to="/login" replace />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        {/* Settings — full page without app sidebar (Deel-style) */}
        <Route element={<SettingsShell />}>
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route element={<AppShell />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route
            path="calendar"
            element={
              <PlaceholderPage
                title="Calendar"
                subtitle="View and manage project schedules and deadlines."
              />
            }
          />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
