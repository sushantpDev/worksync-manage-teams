import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TaskAttachments } from '../components/attachments/TaskAttachments'
import { CommentsSection } from '../components/comments/CommentsSection'
import { PageHeader } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FormSelect } from '../components/ui/FormSelect'
import { StatusSelect } from '../components/ui/StatusSelect'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { ApiError, projectsApi, tasksApi } from '../lib/api'
import type { Project, ProjectUserSummary, Task, TaskPriority, TaskStatus } from '../types'

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const fieldClass =
  'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20'

export function TaskDetailsPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { organization, user } = useAuth()
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  const backTo =
    (location.state as { from?: string } | null)?.from ??
    (location.pathname.includes('/tasks/') ? '/tasks' : '/tasks')

  const canEditFields = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = canEditFields
  const readOnly = user?.role === 'viewer'

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [assignableMembers, setAssignableMembers] = useState<ProjectUserSummary[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadTask = useCallback(async () => {
    if (!taskId) return

    setLoading(true)
    setError(null)

    try {
      const data = await tasksApi.get(taskId)
      setTask(data)
      setTitle(data.title)
      setDescription(data.description ?? '')
      setProjectId(data.projectId)
      setAssigneeId(data.assigneeId ?? '')
      setStatus(data.status)
      setPriority(data.priority)
    } catch (err) {
      setTask(null)
      setError(err instanceof ApiError ? err.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  useEffect(() => {
    if (!organization?.id) return
    projectsApi.list().then(setProjects).catch(() => setProjects([]))
  }, [organization?.id])

  useEffect(() => {
    if (!projectId) {
      setAssignableMembers([])
      return
    }

    projectsApi
      .get(projectId)
      .then((project) => {
        const members = project.members ?? []
        const owner = project.owner
        const combined = owner ? [owner, ...members] : members
        const unique = new Map<string, ProjectUserSummary>()
        for (const member of combined) {
          unique.set(member.id, member)
        }
        setAssignableMembers([...unique.values()])
      })
      .catch(() => setAssignableMembers([]))
  }, [projectId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!task) return

    setSaveError(null)
    setSubmitting(true)

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        assigneeId: assigneeId || undefined,
        status,
        priority,
      }

      const saved = await tasksApi.update(
        task.id,
        canEditFields ? payload : { status }
      )
      setTask(saved)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!task || !canDelete) return

    setSaveError(null)
    setDeleting(true)

    try {
      await tasksApi.delete(task.id)
      navigate(backTo, { replace: true })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...assignableMembers.map((member) => ({
      value: member.id,
      label: `${member.firstName} ${member.lastName}`,
    })),
  ]

  if (
    task?.assigneeId &&
    !assigneeOptions.some((option) => option.value === task.assigneeId)
  ) {
    const currentAssignee = task.assignee
    if (currentAssignee) {
      assigneeOptions.push({
        value: currentAssignee.id,
        label: `${currentAssignee.firstName} ${currentAssignee.lastName}`,
      })
    }
  }

  return (
    <div>
      <PageHeader
        title={task?.title ?? 'Task'}
        subtitle={readOnly ? 'View task details' : 'Edit task details, attachments, and comments'}
        mobileNavOpen={mobileNavOpen}
        onMobileNavToggle={() => setMobileNavOpen(!mobileNavOpen)}
        actions={
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      {loading && <LoadingState message="Loading task..." />}

      {!loading && error && (
        <EmptyState
          title="Could not load task"
          description={error}
          actionLabel="Back to tasks"
          onAction={() => navigate('/tasks')}
        />
      )}

      {!loading && task && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Card padding="default">
            <form onSubmit={handleSubmit} className="space-y-3">
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-primary">Title</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canEditFields}
                  className={fieldClass}
                  placeholder="Task title"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-primary">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEditFields}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20 disabled:opacity-60"
                  placeholder="Optional details"
                />
              </label>

              <FormSelect
                label="Project"
                value={projectId}
                placeholder="Select project"
                required
                disabled={!canEditFields}
                options={[
                  { value: '', label: 'Select project' },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
                onChange={setProjectId}
              />

              <FormSelect
                label="Assignee"
                value={assigneeId}
                placeholder="Unassigned"
                disabled={!canEditFields || !projectId}
                options={assigneeOptions}
                onChange={setAssigneeId}
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-text-primary">Status</span>
                  <StatusSelect
                    value={status}
                    size="md"
                    className="w-full [&>button]:w-full"
                    disabled={readOnly}
                    onChange={setStatus}
                  />
                </label>
                <FormSelect
                  label="Priority"
                  value={priority}
                  options={priorityOptions}
                  disabled={!canEditFields}
                  onChange={(v) => setPriority(v as TaskPriority)}
                />
              </div>

              {!readOnly && (
                <div className="flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={submitting || deleting}
                      className="mr-auto text-red-600 hover:text-red-700"
                    >
                      {deleting ? 'Deleting...' : 'Delete task'}
                    </Button>
                  )}
                  <Button type="submit" variant="primary" disabled={submitting || deleting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </form>
          </Card>

          <Card padding="default">
            <TaskAttachments taskId={task.id} readOnly={readOnly} />
          </Card>

          <Card padding="default">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Comments</h3>
            <CommentsSection
              projectId={task.projectId}
              taskId={task.id}
              readOnly={readOnly}
              compact
              composerPosition="bottom"
            />
          </Card>
        </div>
      )}
    </div>
  )
}
