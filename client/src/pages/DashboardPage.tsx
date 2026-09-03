import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  ClipboardList,
  FolderKanban,
  Sparkles,
  Target,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { activityToFeedItem, RecentActivityFeedItem } from '../components/ui/ActivityItem'
import { Avatar } from '../components/ui/Avatar'
import { MobileNavToggle } from '../components/layout/Sidebar'
import { Card, CardHeader } from '../components/ui/Card'
import { ProjectIcon } from '../components/ui/KpiCard'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { ApiError, dashboardApi, tasksApi } from '../lib/api'
import { canCreateProject } from '../lib/permissions'
import { getProjectIconConfig } from '../lib/projectIcons'
import { formatDate } from '../lib/utils'
import type { DashboardResponse, Task } from '../types'

function getHealthLabel(progress: number) {
  if (progress >= 60) return { label: 'On Track', className: 'bg-green-100 text-green-700' }
  if (progress >= 35) return { label: 'At Risk', className: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Delayed', className: 'bg-red-100 text-red-700' }
}

const kpiIcons = [Target, FolderKanban, ClipboardList, CalendarCheck]
const kpiTones = [
  'bg-[#fff3c4] text-[#9a5b00]',
  'bg-[#dff8ec] text-[#14803c]',
  'bg-[#e7f3ff] text-[#1670bd]',
  'bg-[#ede4ff] text-[#6d45c2]',
]

function DashboardHeroVisual({ dashboard }: { dashboard: DashboardResponse }) {
  const completionRate =
    dashboard.totalTasks > 0
      ? Math.round((dashboard.completedTasks / dashboard.totalTasks) * 100)
      : 0

  return (
    <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden px-6 py-8">
      <div className="absolute right-12 top-8 h-36 w-36 rounded-full bg-[#ffcf2f]" />
      <div className="absolute bottom-8 left-10 h-28 w-28 rotate-12 rounded-[2rem] bg-white/45" />
      <div className="absolute right-7 top-16 h-56 w-56 rotate-12 border border-[#ff6b35]" />

      <div className="relative w-full max-w-[440px] rounded-2xl bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between border-b border-[#eef0f4] pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
              Workspace health
            </p>
            <p className="mt-1 text-sm font-semibold text-[#111827]">
              {dashboard.activeProjects} active projects
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ede4ff] text-[#4c2f87]">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[conic-gradient(#16a34a_var(--progress),#f0f2f5_0)] p-2 [--progress:0deg]" style={{ '--progress': `${completionRate * 3.6}deg` } as CSSProperties}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-2xl font-semibold text-[#111827]">
              {completionRate}%
            </div>
          </div>
          <div className="space-y-3">
            {([
              ['Completed tasks', dashboard.completedTasks, '#16a34a'],
              ['In progress', dashboard.inProgressTasks, '#8b5cf6'],
              ['Overdue', dashboard.overdueTasks, '#f97316'],
            ] satisfies Array<[string, number, string]>).map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-medium text-[#475467]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
                <span className="text-sm font-semibold text-[#111827]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardKpiTile({
  label,
  value,
  trendLabel,
  index,
}: {
  label: string
  value: string
  trendLabel: string
  index: number
}) {
  const Icon = kpiIcons[index % kpiIcons.length]

  return (
    <article className="bg-white px-7 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
            {label}
          </p>
          <p className="mt-5 text-[2.35rem] font-semibold leading-none text-[#07111f]">
            {value}
          </p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${kpiTones[index % kpiTones.length]}`}>
          <Icon className="h-6 w-6" strokeWidth={2.1} />
        </div>
      </div>
      <p className="mt-5 inline-flex rounded-full bg-[#f5f7fb] px-3 py-1 text-xs font-semibold text-[#667085]">
        {trendLabel}
      </p>
    </article>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { organization, user } = useAuth()
  const { refresh: refreshNotifications } = useNotifications()
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null)

  const canCreate = canCreateProject(user?.role)

  const loadDashboard = useCallback(async () => {
    if (!organization?.id) {
      setDashboard(null)
      setMyTasks([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await dashboardApi.get()
      setDashboard(data)
      setMyTasks(data.myTasks)
      await refreshNotifications()
    } catch (err) {
      setDashboard(null)
      setMyTasks([])
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [organization?.id, refreshNotifications])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const progressProjects =
    dashboard?.projectProgressList
      .filter((p) => p.status === 'active')
      .slice(0, 4) ?? []

  async function toggleTodo(task: Task) {
    if (togglingTaskId) return

    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    setTogglingTaskId(task.id)

    try {
      const updated = await tasksApi.update(task.id, { status: nextStatus })
      setMyTasks((prev) => {
        if (nextStatus === 'done') {
          return prev.filter((t) => t.id !== task.id)
        }
        return prev.map((t) => (t.id === task.id ? updated : t))
      })
      await loadDashboard()
    } catch {
      setError('Failed to update task')
    } finally {
      setTogglingTaskId(null)
    }
  }

  if (loading) {
    return <LoadingState message="Loading dashboard..." />
  }

  if (error || !dashboard) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={error ?? 'No data available for this organization.'}
        actionLabel="Try again"
        onAction={loadDashboard}
      />
    )
  }

  const recentActivityItems = dashboard.recentActivities.map(activityToFeedItem)

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <MobileNavToggle
          open={mobileNavOpen}
          onToggle={() => setMobileNavOpen(!mobileNavOpen)}
        />
        <div>
          <h1 className="text-[2rem] font-bold leading-tight text-[#07111f]">
            Welcome, {user?.firstName ?? 'there'} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Overview of your workspace activity and progress.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e1e4ea] bg-white">
        <div className="grid bg-[#ffefb8] lg:grid-cols-[1fr_0.85fr]">
          <div className="px-8 py-10 sm:px-10 lg:px-12 lg:py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#667085]">
              Workspace command center
            </p>
            <h2 className="mt-5 max-w-[650px] text-[2rem] font-bold leading-[1.12] text-[#07111f] sm:text-[2.55rem]">
              Plan faster. Track clearly. Keep work moving.
            </h2>
            <p className="mt-5 max-w-[680px] text-[16px] leading-7 text-[#344054]">
              Monitor project progress, task ownership, and team activity from a
              single operational view built for daily focus.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#111827] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937]"
                >
                  Create project
                </button>
              )}
              <Link
                to="/tasks"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#111827] bg-transparent px-5 text-sm font-semibold text-[#111827] transition-colors hover:bg-white/50"
              >
                Review tasks
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>

          <DashboardHeroVisual dashboard={dashboard} />
        </div>

        <div className={`grid gap-px bg-[#e6e8ee] sm:grid-cols-2 ${dashboard.kpis.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          {dashboard.kpis.map((kpi, index) => (
            <DashboardKpiTile
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              trendLabel={kpi.trendLabel}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl border-[#e1e4ea] shadow-none" padding="lg">
          <CardHeader
            title="Project Progress"
            action={
              <Link
                to="/projects"
                className="text-xs font-semibold text-[#667085] hover:text-[#111827]"
              >
                View all
              </Link>
            }
          />
          {progressProjects.length === 0 ? (
            <div className="rounded-xl bg-[#f8fafc] px-4 py-6 text-sm text-[#667085]">
              No active projects yet.
            </div>
          ) : (
            <div className="space-y-4">
              {progressProjects.map((project) => {
                const iconConfig = getProjectIconConfig(project.id)
                const health = getHealthLabel(project.progress)
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-[#eef1f5] bg-white p-4 transition-colors hover:bg-[#f8fafc]"
                  >
                    <ProjectIcon icon={iconConfig.icon} color={iconConfig.color} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[#111827]">
                          {project.name}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-semibold tabular-nums text-[#111827]">
                            {project.progress}%
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${health.className}`}
                          >
                            {health.label}
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={project.progress} color={iconConfig.color} size="sm" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border-[#e1e4ea] shadow-none" padding="lg">
          <CardHeader
            title="My To-do List"
            action={
              <Link
                to="/tasks"
                className="text-xs font-semibold text-[#667085] hover:text-[#111827]"
              >
                View all
              </Link>
            }
          />
          {myTasks.length === 0 ? (
            <div className="rounded-xl bg-[#f8fafc] px-4 py-6 text-sm text-[#667085]">
              No tasks assigned to you right now.
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.map((task) => {
                const isDone = task.status === 'done'
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-2xl border border-[#eef1f5] bg-white px-4 py-3 transition-colors hover:bg-[#f8fafc]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTodo(task)}
                      disabled={togglingTaskId === task.id}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isDone
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-[#d7dce3] hover:border-[#8a94a6]'
                      }`}
                    >
                      {isDone && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <Link to={`/projects/${task.projectId}`} className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          isDone
                            ? 'text-text-muted line-through'
                            : 'font-semibold text-[#111827]'
                        }`}
                      >
                        {task.title}
                      </p>
                    </Link>
                    {task.dueDate && (
                      <span className="shrink-0 rounded-full bg-[#f5f7fb] px-2 py-1 text-[11px] font-semibold text-[#667085]">
                        {formatDate(task.dueDate, { year: undefined })}
                      </span>
                    )}
                    {task.assigneeId && (
                      <Avatar userId={task.assigneeId} size="xs" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-7 grid gap-7 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative overflow-hidden rounded-2xl bg-[#fff0a8] p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ffcc2f]" />
          <div className="relative rounded-2xl bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.13)]">
            <div className="flex items-center justify-between border-b border-[#eef0f4] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
                  This week
                </p>
                <p className="mt-1 text-3xl font-semibold text-[#111827]">
                  {dashboard.completedTasks}/{dashboard.totalTasks}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ede4ff] text-[#6d45c2]">
                <BarChart3 className="h-5 w-5" strokeWidth={2.1} />
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-[#667085]">
              Completed tasks out of all tracked tasks in this workspace.
            </p>
          </div>
        </div>

        <Card className="rounded-2xl border-[#e1e4ea] shadow-none" padding="lg">
          <CardHeader title="Recent Activity" />
          {recentActivityItems.length === 0 ? (
            <div className="rounded-xl bg-[#f8fafc] px-4 py-6 text-sm text-[#667085]">
              No recent activity yet.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {recentActivityItems.map((item) => (
                <RecentActivityFeedItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
