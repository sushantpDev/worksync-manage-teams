import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Plus,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import { MobileNavToggle } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
} from '../components/ui/DataTable'
import { FilterDropdown } from '../components/ui/FilterDropdown'
import { SearchBar } from '../components/ui/SearchBar'
import { TaskTableRow } from '../components/ui/TaskCard'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { ApiError, organizationsApi, tasksApi } from '../lib/api'
import type { OrganizationMember, Task, TaskPriority, TaskStatus } from '../types'

const columns: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
]

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  ...columns.map((c) => ({ value: c.id, label: c.label })),
]

const priorityOptions = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const sortOptions = [
  { value: 'due', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'updated', label: 'Last Updated' },
]

const priorityOrder: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === 'done') return false
  return new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
}

function TaskStatTile({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  description: string
  icon: LucideIcon
  tone: string
}) {
  return (
    <article className="rounded-2xl border border-[#e6e9ef] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
            {label}
          </p>
          <p className="mt-4 text-[2rem] font-semibold leading-none text-[#07111f]">
            {value}
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#667085]">{description}</p>
    </article>
  )
}

export function TasksPage() {
  const navigate = useNavigate()
  const { organization, user } = useAuth()
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('due')
  const [modalOpen, setModalOpen] = useState(false)

  const canCreate = user?.role === 'admin' || user?.role === 'manager'
  const canViewAllTasks = canCreate
  const canChangeStatus =
    user?.role === 'admin' || user?.role === 'manager' || user?.role === 'member'
  const canEditFields = canCreate

  const loadTasks = useCallback(async () => {
    if (!organization?.id) {
      setTasks([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await tasksApi.list()
      setTasks(data)
    } catch (err) {
      setTasks([])
      setError(err instanceof ApiError ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    if (!organization?.id) {
      setMembers([])
      return
    }
    organizationsApi.listMembers(organization.id).then(setMembers).catch(() => setMembers([]))
  }, [organization?.id])

  const assigneeOptions = useMemo(
    () => [
      { value: 'all', label: 'All Assignees' },
      ...members.map((m) => ({
        value: m.id,
        label: `${m.firstName} ${m.lastName}`,
      })),
    ],
    [members]
  )

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }

    if (assigneeFilter !== 'all') {
      result = result.filter((t) => t.assigneeId === assigneeFilter)
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter)
    }

    switch (sortBy) {
      case 'priority':
        result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        break
      case 'updated':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
      default:
        result.sort((a, b) => {
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })
    }

    return result
  }, [tasks, search, statusFilter, assigneeFilter, priorityFilter, sortBy])

  function upsertTask(saved: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = [...prev]
      next[idx] = saved
      return next
    })
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      const saved = await tasksApi.update(taskId, { status })
      upsertTask(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update task status')
    }
  }

  function openCreate() {
    setModalOpen(true)
  }

  function openTask(task: Task) {
    const canViewAsViewer = user?.role === 'viewer' && task.assigneeId === user.id
    if (canChangeStatus || canEditFields || canViewAsViewer) {
      navigate(`/tasks/${task.id}`, { state: { from: '/tasks' } })
    }
  }

  const completedCount = tasks.filter((task) => task.status === 'done').length
  const activeCount = tasks.filter((task) => task.status !== 'done').length
  const overdueCount = tasks.filter(isOverdue).length
  const assignedCount = tasks.filter((task) => task.assigneeId).length

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
              Tasks
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Prioritize assignments, track due dates, and move work forward.
            </p>
          </div>
        </div>

        {canCreate && (
          <Button size="md" className="rounded-full px-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TaskStatTile
          label="Total tasks"
          value={tasks.length}
          description={`${filteredTasks.length} visible with current filters`}
          icon={ClipboardList}
          tone="bg-[#e0f2fe] text-[#0369a1]"
        />
        <TaskStatTile
          label="Active work"
          value={activeCount}
          description="Tasks still moving through the workflow"
          icon={CalendarClock}
          tone="bg-[#ede4ff] text-[#6d45c2]"
        />
        <TaskStatTile
          label="Completed"
          value={completedCount}
          description="Tasks that have reached done"
          icon={CheckCircle2}
          tone="bg-[#dcfce7] text-[#15803d]"
        />
        <TaskStatTile
          label="Assigned"
          value={assignedCount}
          description={`${overdueCount} task${overdueCount === 1 ? '' : 's'} currently overdue`}
          icon={overdueCount > 0 ? AlertCircle : UserCheck}
          tone={overdueCount > 0 ? 'bg-[#fff3c4] text-[#a15c00]' : 'bg-[#ffe4ee] text-[#be185d]'}
        />
      </section>

      {loading && <LoadingState message="Loading tasks..." />}

      {!loading && error && (
        <EmptyState
          title="Could not load tasks"
          description={error}
          actionLabel="Try again"
          onAction={loadTasks}
        />
      )}

      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          title="No tasks yet"
          description="Create tasks to track work across your projects."
          actionLabel={canCreate ? 'Add Task' : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      )}

      {!loading && !error && tasks.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[#e1e4ea] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#eef1f5] px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
            <SearchBar
              placeholder="Search tasks..."
              value={search}
              onChange={setSearch}
              className="w-full max-w-md"
            />

            <div className="flex flex-wrap items-center gap-2.5">
              {canViewAllTasks && (
                <FilterDropdown
                  label="Assignee"
                  value={assigneeFilter}
                  options={assigneeOptions}
                  onChange={setAssigneeFilter}
                />
              )}
              <FilterDropdown
                label="Status"
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />
              <FilterDropdown
                label="Priority"
                value={priorityFilter}
                options={priorityOptions}
                onChange={setPriorityFilter}
              />
              <FilterDropdown
                label="Sort"
                value={sortBy}
                options={sortOptions}
                onChange={setSortBy}
              />
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-[#111827]">No matching tasks</p>
              <p className="mt-1 text-sm text-[#667085]">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <DataTable className="rounded-none border-0" tableClassName="min-w-[980px]">
              <DataTableHead>
                <DataTableHeaderCell>Task</DataTableHeaderCell>
                <DataTableHeaderCell>Assignee</DataTableHeaderCell>
                <DataTableHeaderCell>Priority</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Due</DataTableHeaderCell>
                <DataTableHeaderCell>Activity</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {filteredTasks.map((task) => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    onClick={() => openTask(task)}
                    canChangeStatus={canChangeStatus}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </section>
      )}

      {canCreate && (
        <TaskFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={upsertTask}
          organizationId={organization?.id}
        />
      )}
    </div>
  )
}
