import { useEffect, useState } from 'react'
import type { Project, ProjectStatus } from '../../types'
import { ApiError, projectsApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { FormSelect } from '../ui/FormSelect'
import { Modal } from '../ui/Modal'

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
]

function toDateInput(value?: string) {
  if (!value) return ''
  return value.slice(0, 10)
}

function defaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

const fieldClass =
  'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20'

export function ProjectFormModal({
  open,
  onClose,
  onSuccess,
  project,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (project: Project) => void
  project?: Project
}) {
  const isEdit = Boolean(project)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('planning')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    if (project) {
      setName(project.name)
      setDescription(project.description)
      setStatus(project.status)
      setStartDate(toDateInput(project.startDate))
      setDueDate(toDateInput(project.dueDate))
      setProgress(project.progress)
    } else {
      setName('')
      setDescription('')
      setStatus('planning')
      setStartDate(new Date().toISOString().slice(0, 10))
      setDueDate(defaultDueDate())
      setProgress(0)
    }
    setError(null)
  }, [open, project])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        startDate,
        dueDate,
        ...(isEdit ? { progress } : {}),
      }

      const saved = isEdit
        ? await projectsApi.update(project!.id, payload)
        : await projectsApi.create(payload)

      onSuccess(saved)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'New Project'}
      description={
        isEdit
          ? 'Update project details for your organization.'
          : 'Create a project for your active organization.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            placeholder="Project name"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
            placeholder="What is this project about?"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-primary">Start date</span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-primary">Due date</span>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormSelect
            label="Status"
            value={status}
            options={statusOptions}
            onChange={(v) => {
              const next = v as ProjectStatus
              setStatus(next)
              if (next === 'completed') setProgress(100)
            }}
          />
          {isEdit && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-primary">Progress</span>
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                disabled={status === 'completed'}
                className={fieldClass}
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
