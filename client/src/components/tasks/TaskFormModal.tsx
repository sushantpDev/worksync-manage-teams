import { useEffect, useState } from 'react'
import type { Project, ProjectUserSummary, Task, TaskPriority, TaskStatus } from '../../types'
import { ApiError, projectsApi, tasksApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { FormSelect } from '../ui/FormSelect'
import { Modal } from '../ui/Modal'
import { StatusSelect } from '../ui/StatusSelect'

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const fieldClass =
  'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20'

export function TaskFormModal({
  open,
  onClose,
  onSuccess,
  defaultProjectId,
  organizationId,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (task: Task) => void
  defaultProjectId?: string
  organizationId?: string
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [projects, setProjects] = useState<Project[]>([])
  const [assignableMembers, setAssignableMembers] = useState<ProjectUserSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !organizationId) return

    projectsApi.list().then(setProjects).catch(() => setProjects([]))
  }, [open, organizationId])

  useEffect(() => {
    if (!open || !projectId) {
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
  }, [open, projectId])

  useEffect(() => {
    if (!open) return

    setTitle('')
    setDescription('')
    setProjectId(defaultProjectId ?? '')
    setAssigneeId('')
    setStatus('todo')
    setPriority('medium')
    setError(null)
  }, [open, defaultProjectId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (!projectId) {
        setError('Please select a project')
        setSubmitting(false)
        return
      }

      const saved = await tasksApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        assigneeId: assigneeId || undefined,
        status,
        priority,
      })

      onSuccess(saved)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  const lockProject = Boolean(defaultProjectId)

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...assignableMembers.map((member) => ({
      value: member.id,
      label: `${member.firstName} ${member.lastName}`,
    })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Task"
      description="Create a task for your project."
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" variant="primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text-primary">Title</span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
            placeholder="Task title"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text-primary">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
            placeholder="Optional details"
          />
        </label>

        <FormSelect
          label="Project"
          value={projectId}
          placeholder="Select project"
          required
          disabled={lockProject}
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
          disabled={!projectId}
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
              onChange={setStatus}
            />
          </label>
          <FormSelect
            label="Priority"
            value={priority}
            options={priorityOptions}
            onChange={(v) => setPriority(v as TaskPriority)}
          />
        </div>
      </form>
    </Modal>
  )
}
