import { ChevronRight, Pencil, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ProjectComments } from '../components/comments/ProjectComments'
import { ArchiveProjectModal } from '../components/projects/ArchiveProjectModal'
import { DeleteProjectModal } from '../components/projects/DeleteProjectModal'
import { ProjectActionsMenu } from '../components/projects/ProjectActionsMenu'
import { ProjectFormModal } from '../components/projects/ProjectFormModal'
import { ProjectTeamModal } from '../components/projects/ProjectTeamModal'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import { ActivityItem } from '../components/ui/ActivityItem'
import { Avatar } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { KpiCard } from '../components/ui/KpiCard'
import { TaskTableRow } from '../components/ui/TaskCard'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { ApiError, activitiesApi, organizationsApi, projectsApi, tasksApi, teamsApi } from '../lib/api'
import { canArchiveProject, canDeleteProject } from '../lib/permissions'
import { formatDate, cn } from '../lib/utils'
import type { Activity, OrganizationMember, Project, Task, TaskStatus, Team } from '../types'

const taskColumns: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
]

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { organization, user } = useAuth()
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([])
  const [orgTeams, setOrgTeams] = useState<Team[]>([])
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canEditProject = user?.role === 'admin' || user?.role === 'manager'
  const canArchive = canArchiveProject(user?.role)
  const canDelete = canDeleteProject(user?.role)
  const canCreateTask = canEditProject
  const canChangeStatus =
    user?.role === 'admin' || user?.role === 'manager' || user?.role === 'member'

  const loadProject = useCallback(async () => {
    if (!projectId || !organization?.id) {
      setProject(null)
      return null
    }

    try {
      const data = await projectsApi.get(projectId)
      setProject(data)
      return data
    } catch (err) {
      setProject(null)
      setError(err instanceof ApiError ? err.message : 'Failed to load project')
      return null
    }
  }, [projectId, organization?.id])

  const loadTasks = useCallback(async () => {
    if (!projectId || !organization?.id) {
      setTasks([])
      return
    }

    try {
      const data = await tasksApi.list({ projectId })
      setTasks(data)
    } catch {
      setTasks([])
    }
  }, [projectId, organization?.id])

  const loadActivities = useCallback(async () => {
    if (!projectId || !organization?.id) {
      setActivities([])
      setActivitiesLoading(false)
      return
    }

    setActivitiesLoading(true)
    setActivitiesError(null)

    try {
      const data = await activitiesApi.list({ projectId })
      setActivities(data)
    } catch (err) {
      setActivities([])
      setActivitiesError(err instanceof ApiError ? err.message : 'Failed to load activity')
    } finally {
      setActivitiesLoading(false)
    }
  }, [projectId, organization?.id])

  const loadAll = useCallback(async () => {
    if (!projectId || !organization?.id) {
      setProject(null)
      setTasks([])
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    await loadProject()
    await loadTasks()
    await loadActivities()
    setLoading(false)
  }, [projectId, organization?.id, loadProject, loadTasks, loadActivities])

  useEffect(() => {
    if (!organization?.id || !canEditProject) {
      setOrgMembers([])
      setOrgTeams([])
      return
    }

    Promise.all([
      organizationsApi.listMembers(organization.id),
      teamsApi.list(organization.id),
    ])
      .then(([members, teams]) => {
        setOrgMembers(members)
        setOrgTeams(teams)
      })
      .catch(() => {
        setOrgMembers([])
        setOrgTeams([])
      })
  }, [organization?.id, canEditProject])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const taskStatusFilters = useMemo(
    () => [
      { id: 'all' as const, label: 'All', count: tasks.length },
      ...taskColumns.map((column) => ({
        id: column.id,
        label: column.label,
        count: tasks.filter((t) => t.status === column.id).length,
      })),
    ],
    [tasks]
  )

  const visibleTasks = useMemo(() => {
    if (taskStatusFilter === 'all') return tasks
    return tasks.filter((t) => t.status === taskStatusFilter)
  }, [tasks, taskStatusFilter])

  if (loading) {
    return <LoadingState message="Loading project..." />
  }

  if (error || !project) {
    return (
      <div className="py-16">
        <EmptyState
          title="Project not found"
          description={error ?? 'This project may not exist in your active organization.'}
          actionLabel="Back to Projects"
          onAction={() => navigate('/projects')}
        />
      </div>
    )
  }

  const owner = project.owner ?? undefined
  const members = project.members ?? []
  const assignedTeams = project.teams ?? []
  const teamMemberCount = members.length
  const teamSubtitle =
    assignedTeams.length > 0
      ? `${assignedTeams.length} team${assignedTeams.length === 1 ? '' : 's'} · ${teamMemberCount} member${teamMemberCount === 1 ? '' : 's'}`
      : `${teamMemberCount} member${teamMemberCount === 1 ? '' : 's'}`

  const doneCount = tasks.filter((t) => t.status === 'done').length
  const completionPercent =
    tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
  const pendingCount = tasks.length - doneCount

  function openTask(task: Task) {
    const canViewAsViewer = user?.role === 'viewer' && task.assigneeId === user.id
    if (canChangeStatus || canCreateTask || canViewAsViewer) {
      navigate(`/tasks/${task.id}`, {
        state: { from: `/projects/${projectId}` },
      })
    }
  }

  const kpis = [
    {
      label: 'Total Tasks',
      value: String(tasks.length),
      trendLabel: `${tasks.length} in this project`,
      sparkline: [0, 0, 0, 0, 0, 0, tasks.length],
      variant: 'yellow' as const,
    },
    {
      label: 'Completed',
      value: String(doneCount),
      trendLabel: `${completionPercent}% of total`,
      sparkline: [0, 0, 0, 0, 0, 0, doneCount],
      variant: 'green' as const,
    },
    {
      label: 'Progress',
      value: `${completionPercent}%`,
      trendLabel:
        completionPercent === 100 && tasks.length > 0
          ? 'All tasks complete'
          : pendingCount > 0
            ? `${pendingCount} remaining`
            : 'No tasks yet',
      sparkline: [0, 0, 0, 0, 0, 0, completionPercent],
      variant: 'orange' as const,
    },
  ]

  function upsertTask(saved: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = [...prev]
      next[idx] = saved
      return next
    })
    loadProject()
    loadActivities()
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      const saved = await tasksApi.update(taskId, { status })
      upsertTask(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update task status')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="mb-3 text-xs text-text-muted lg:hidden"
        >
          Menu
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              to="/projects"
              className="mb-2 flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
            >
              Projects <ChevronRight className="h-3 w-3" />
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
              {owner && (
                <span className="flex items-center gap-2">
                  <Avatar
                    userId={owner.id}
                    name={`${owner.firstName} ${owner.lastName}`}
                    src={owner.avatarUrl}
                    size="xs"
                  />
                  {owner.firstName} {owner.lastName}
                </span>
              )}
              <span>Due {formatDate(project.dueDate)}</span>
              <span>{project.progress}% complete</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreateTask && (
              <Button variant="primary" size="sm" onClick={() => setTaskModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            )}
            {canEditProject && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {((canArchive && project.status !== 'archived') || canDelete) && (
              <ProjectActionsMenu
                showArchive={canArchive && project.status !== 'archived'}
                showDelete={canDelete}
                onArchive={() => setArchiveOpen(true)}
                onDelete={() => setDeleteOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trendLabel={kpi.trendLabel}
            sparkline={kpi.sparkline}
            variant={kpi.variant}
          />
        ))}
      </div>

      <Card className="mt-6" padding="default">
        <CardHeader title="Project Tasks" subtitle={`${tasks.length} tasks`} />
        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Create tasks to track work on this project."
            actionLabel={canCreateTask ? 'Add Task' : undefined}
            onAction={canCreateTask ? () => setTaskModalOpen(true) : undefined}
            className="py-8"
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {taskStatusFilters.map((filter) => {
                const active = taskStatusFilter === filter.id
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setTaskStatusFilter(filter.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-text-primary/20 bg-surface text-text-primary'
                        : 'border-border bg-card text-text-secondary hover:border-text-primary/15 hover:bg-surface/80'
                    )}
                  >
                    {filter.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                        active ? 'bg-card-muted text-text-primary' : 'bg-surface text-text-muted'
                      )}
                    >
                      {filter.count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface/40">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Task
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Assignee
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Priority
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Due
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.length > 0 ? (
                    visibleTasks.map((task) => (
                      <TaskTableRow
                        key={task.id}
                        task={task}
                        onClick={() => openTask(task)}
                        canChangeStatus={canChangeStatus}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-text-muted">
                        No tasks in this status.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding="default">
          <CardHeader title="Activity Timeline" subtitle="Recent project events" />
          {activitiesLoading && <LoadingState message="Loading activity..." />}
          {!activitiesLoading && activitiesError && (
            <EmptyState
              title="Could not load activity"
              description={activitiesError}
              actionLabel="Try again"
              onAction={loadActivities}
              className="py-8"
            />
          )}
          {!activitiesLoading && !activitiesError && activities.length > 0 && (
            <div className="divide-y divide-border-subtle">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
          {!activitiesLoading && !activitiesError && activities.length === 0 && (
            <p className="text-sm text-text-secondary">No activity recorded yet.</p>
          )}
        </Card>

        <Card padding="default">
          <CardHeader
            title="Team Members"
            subtitle={teamSubtitle}
            action={
              canEditProject ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setTeamModalOpen(true)}
                >
                  Manage Team
                </Button>
              ) : undefined
            }
          />

          {assignedTeams.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {assignedTeams.map((team) => (
                <span
                  key={team.id}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-primary"
                >
                  {team.name}
                </span>
              ))}
            </div>
          )}

          {owner ? (
            <div className="mb-4 flex items-center gap-3 border-b border-border-subtle pb-4">
              <Avatar
                userId={owner.id}
                name={`${owner.firstName} ${owner.lastName}`}
                src={owner.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {owner.firstName} {owner.lastName}
                </p>
                <p className="text-xs text-text-muted">Owner</p>
              </div>
            </div>
          ) : null}

          {members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member) => {
                const assignedCount = tasks.filter((t) => t.assigneeId === member.id).length
                const workload = Math.min(100, assignedCount * 20)
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar
                      userId={member.id}
                      name={`${member.firstName} ${member.lastName}`}
                      src={member.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-text-muted">Member</p>
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span>{assignedCount} tasks</span>
                          <span>{workload}% workload</span>
                        </div>
                        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{ width: `${workload}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No members assigned.</p>
          )}
        </Card>
      </div>

      <Card className="mt-6" padding="default">
        <CardHeader title="Recent Comments" />
        <ProjectComments projectId={project.id} onCommentAdded={loadActivities} />
      </Card>

      {canEditProject && (
        <ProjectTeamModal
          open={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          project={project}
          orgMembers={orgMembers}
          orgTeams={orgTeams}
          onSuccess={(updated) => setProject(updated)}
        />
      )}

      {canEditProject && (
        <ProjectFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
          onSuccess={(updated) => setProject(updated)}
        />
      )}

      {canCreateTask && (
        <TaskFormModal
          open={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          onSuccess={upsertTask}
          defaultProjectId={project.id}
          organizationId={organization?.id}
        />
      )}

      <ArchiveProjectModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        project={project}
        onSuccess={(updated) => setProject(updated)}
      />

      <DeleteProjectModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        project={project}
        onSuccess={() => navigate('/projects')}
      />
    </div>
  )
}
