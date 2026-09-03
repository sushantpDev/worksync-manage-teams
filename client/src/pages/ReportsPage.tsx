import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MobileNavToggle } from '../components/layout/Sidebar'
import { Avatar } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
} from '../components/ui/DataTable'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { ApiError, reportsApi } from '../lib/api'
import { canViewReports } from '../lib/permissions'
import { cn, formatDate } from '../lib/utils'
import type { ReportRange, ReportsResponse } from '../types'

const RANGE_OPTIONS: { value: ReportRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
]

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const chartTooltipStyle = {
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  fontSize: '12px',
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-56 animate-pulse rounded-3xl border border-border-subtle bg-card" />
      <div className="h-72 animate-pulse rounded-[var(--radius-card)] border border-border-subtle bg-card" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-[var(--radius-card)] border border-border-subtle bg-card" />
        <div className="h-72 animate-pulse rounded-[var(--radius-card)] border border-border-subtle bg-card" />
      </div>
    </div>
  )
}

function ReportMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone: string
}) {
  return (
    <div className="rounded-2xl border border-[#ead8b9] bg-white/70 p-4 shadow-[0_10px_24px_rgba(111,82,39,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7761]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold leading-none text-[#07111f]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#5f4f3e]">{detail}</p>
    </div>
  )
}

export function ReportsPage() {
  const { organization, user } = useAuth()
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  const [range, setRange] = useState<ReportRange>('30d')
  const [report, setReport] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const allowed = canViewReports(user?.role)

  const loadReport = useCallback(async () => {
    if (!organization?.id || !allowed) {
      setReport(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await reportsApi.get(range)
      setReport(data)
    } catch (err) {
      setReport(null)
      setError(err instanceof ApiError ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [organization?.id, allowed, range])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const statusChartData = useMemo(
    () =>
      (report?.tasksByStatus ?? []).map((item) => ({
        name: STATUS_LABELS[item.status] ?? item.status,
        count: item.count,
      })),
    [report?.tasksByStatus]
  )

  const priorityChartData = useMemo(
    () =>
      (report?.tasksByPriority ?? []).map((item) => ({
        name: PRIORITY_LABELS[item.priority] ?? item.priority,
        count: item.count,
      })),
    [report?.tasksByPriority]
  )

  if (!allowed) {
    return (
      <div>
        <div className="mb-6 flex items-start gap-3">
          <MobileNavToggle
            open={mobileNavOpen}
            onToggle={() => setMobileNavOpen(!mobileNavOpen)}
          />
          <div>
            <h1 className="text-[2rem] font-bold leading-tight text-[#07111f]">Reports</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Organization performance and analytics.
            </p>
          </div>
        </div>
        <EmptyState
          title="Access restricted"
          description="Reports are available to admins and managers only."
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <MobileNavToggle
            open={mobileNavOpen}
            onToggle={() => setMobileNavOpen(!mobileNavOpen)}
          />
          <div>
            <h1 className="text-[2rem] font-bold leading-tight text-[#07111f]">
              Reports
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Organization performance, project health, and team workload.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  range === option.value
                    ? 'bg-[#ded6ff] text-[#111827] shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <ReportsSkeleton />}

      {!loading && error && (
        <EmptyState
          title="Could not load reports"
          description={error}
          actionLabel="Try again"
          onAction={loadReport}
        />
      )}

      {!loading && !error && report && (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-[#ead8b9] bg-[#fff0d2] shadow-[0_18px_46px_rgba(111,82,39,0.10)]">
            <div className="pointer-events-none absolute right-[-48px] top-8 h-44 w-72 rotate-[-14deg] bg-[#ffd66b]/45" />
            <div className="pointer-events-none absolute bottom-[-40px] left-[36%] h-32 w-80 rotate-[12deg] bg-[#cbb6ff]/28" />
            <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] xl:p-7">
              <div className="relative flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ded6ff] text-[#5b35a6]">
                    <BarChart3 className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#8a7761]">
                    {range.toUpperCase()} snapshot
                  </p>
                  <h2 className="mt-3 max-w-md text-4xl font-semibold leading-tight text-[#07111f]">
                    {report.overview.completionRate}% completion rate
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-[#3f352b]">
                    {report.overview.completedTasks} of {report.overview.totalTasks} tasks are
                    complete across {report.overview.totalProjects} projects.
                  </p>
                </div>
                <div className="mt-6 max-w-sm">
                  <ProgressBar
                    value={report.overview.completionRate}
                    color="slate"
                    size="md"
                    showLabel
                  />
                </div>
              </div>

              <div className="relative grid gap-3 sm:grid-cols-2">
                <ReportMetric
                  label="Projects"
                  value={report.overview.totalProjects}
                  detail={`${report.overview.activeProjects} active, ${report.overview.completedProjects} completed`}
                  icon={FolderKanban}
                  tone="bg-[#e0f2fe] text-[#0369a1]"
                />
                <ReportMetric
                  label="Total tasks"
                  value={report.overview.totalTasks}
                  detail={`${report.overview.completedTasks} completed in this workspace`}
                  icon={CheckCircle2}
                  tone="bg-[#dcfce7] text-[#15803d]"
                />
                <ReportMetric
                  label="In motion"
                  value={report.overview.inProgressTasks}
                  detail="Tasks in progress or waiting for review"
                  icon={Activity}
                  tone="bg-[#ede4ff] text-[#6d45c2]"
                />
                <ReportMetric
                  label="Overdue"
                  value={report.overview.overdueTasks}
                  detail="Past due and not yet marked done"
                  icon={report.overview.overdueTasks > 0 ? AlertTriangle : Clock3}
                  tone={
                    report.overview.overdueTasks > 0
                      ? 'bg-[#fee2e2] text-[#b91c1c]'
                      : 'bg-[#fff3c4] text-[#a15c00]'
                  }
                />
              </div>
            </div>
          </section>

          <Card className="rounded-3xl border-[#e1e4ea] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_34px_rgba(15,23,42,0.04)]">
            <CardHeader title="Project Performance" subtitle="Sorted by overdue tasks first" />
            {report.projectPerformance.length === 0 ? (
              <p className="text-sm text-text-secondary">No projects in this organization yet.</p>
            ) : (
              <DataTable>
                <DataTableHead>
                  <DataTableHeaderCell>Project</DataTableHeaderCell>
                  <DataTableHeaderCell>Status</DataTableHeaderCell>
                  <DataTableHeaderCell>Progress</DataTableHeaderCell>
                  <DataTableHeaderCell>Total Tasks</DataTableHeaderCell>
                  <DataTableHeaderCell>Completed</DataTableHeaderCell>
                  <DataTableHeaderCell>In Progress</DataTableHeaderCell>
                  <DataTableHeaderCell>Overdue</DataTableHeaderCell>
                  <DataTableHeaderCell>Due Date</DataTableHeaderCell>
                </DataTableHead>
                <DataTableBody>
                  {report.projectPerformance.map((project) => (
                    <tr
                      key={project.projectId}
                      className="border-b border-border-subtle last:border-0 hover:bg-[#fbfcff]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/projects/${project.projectId}`}
                          className="text-sm font-medium text-text-primary hover:text-accent-purple"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="min-w-[140px] px-4 py-3">
                        <ProgressBar value={project.progress} color="blue" size="sm" showLabel />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{project.totalTasks}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {project.completedTasks}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {project.inProgressTasks}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{project.overdueTasks}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {project.dueDate ? formatDate(project.dueDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-[#e1e4ea]">
              <CardHeader title="Tasks by Status" />
              {statusChartData.every((item) => item.count === 0) ? (
                <p className="text-sm text-text-secondary">No tasks in scope.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" fill="#6d45c2" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="rounded-3xl border-[#e1e4ea]">
              <CardHeader title="Tasks by Priority" />
              {priorityChartData.every((item) => item.count === 0) ? (
                <p className="text-sm text-text-secondary">No tasks in scope.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </section>

          <Card className="rounded-3xl border-[#e1e4ea]">
            <CardHeader
              title="Completion Trend"
              subtitle="Tasks marked done during the selected period (from activity history)"
            />
            {report.completionTrend.every((point) => point.count === 0) ? (
              <p className="text-sm text-text-secondary">
                No task completions recorded in this period.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.completionTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border-[#e1e4ea]">
            <CardHeader title="Team Workload" subtitle="Assigned tasks within report scope" />
            {report.teamWorkload.length === 0 ? (
              <p className="text-sm text-text-secondary">No team members found.</p>
            ) : (
              <DataTable>
                <DataTableHead>
                  <DataTableHeaderCell>Member</DataTableHeaderCell>
                  <DataTableHeaderCell>Role</DataTableHeaderCell>
                  <DataTableHeaderCell>Assigned Tasks</DataTableHeaderCell>
                  <DataTableHeaderCell>In Progress</DataTableHeaderCell>
                  <DataTableHeaderCell>In Review</DataTableHeaderCell>
                  <DataTableHeaderCell>Completed</DataTableHeaderCell>
                  <DataTableHeaderCell>Overdue</DataTableHeaderCell>
                </DataTableHead>
                <DataTableBody>
                  {report.teamWorkload.map((member) => (
                    <tr
                      key={member.userId}
                      className="border-b border-border-subtle last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            userId={member.userId}
                            name={member.name}
                            src={member.avatarUrl ?? undefined}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{member.name}</p>
                            <p className="text-xs text-text-muted">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.role} />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {member.assignedTasks}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{member.inProgress}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{member.inReview}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{member.completed}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{member.overdue}</td>
                    </tr>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
