import { CalendarDays, MessageSquare, Paperclip } from 'lucide-react'
import type { Task, TaskStatus } from '../../types'
import { formatDate } from '../../lib/utils'
import { Avatar } from './Avatar'
import { StatusBadge } from './Badge'
import { StatusSelect } from './StatusSelect'
import { cn } from '../../lib/utils'

function resolveAssignee(task: Task) {
  return task.assignee ?? undefined
}

function assigneeName(task: Task) {
  const assignee = resolveAssignee(task)
  if (!assignee) return 'Unassigned'
  return `${assignee.firstName} ${assignee.lastName}`.trim()
}

function shortTaskId(id: string) {
  return `TASK-${id.slice(-6).toUpperCase()}`
}

export function TaskTableRow({
  task,
  onClick,
  onStatusChange,
  canChangeStatus = false,
}: {
  task: Task
  onClick?: () => void
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  canChangeStatus?: boolean
}) {
  const assignee = resolveAssignee(task)

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-[#eef1f5] transition-colors hover:bg-[#f8fafc]',
        onClick && 'cursor-pointer'
      )}
    >
      <td className="px-5 py-4">
        <div className="min-w-[12rem]">
          <p className="text-sm font-semibold text-[#111827]">{task.title}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
            {shortTaskId(task.id)}
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        {assignee ? (
          <div className="flex items-center gap-2.5">
            <Avatar
              userId={assignee.id}
              name={`${assignee.firstName} ${assignee.lastName}`}
              src={assignee.avatarUrl}
              size="sm"
            />
            <span className="text-sm font-medium text-[#475467]">{assigneeName(task)}</span>
          </div>
        ) : (
          <span className="rounded-full bg-[#f5f7fb] px-2.5 py-1 text-xs font-semibold text-[#98a2b3]">
            Unassigned
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={task.priority} />
      </td>
      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
        {canChangeStatus && onStatusChange ? (
          <StatusSelect
            value={task.status}
            onChange={(status) => onStatusChange(task.id, status)}
          />
        ) : (
          <StatusBadge status={task.status} />
        )}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f7fb] px-2.5 py-1 text-xs font-semibold text-[#475467]">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
            {formatDate(task.dueDate, { year: undefined })}
          </span>
        ) : (
          <span className="text-xs text-[#98a2b3]">No date</span>
        )}
      </td>
      <td className="px-5 py-4 text-xs whitespace-nowrap">
        {task.status === 'done' ? (
          <span className="rounded-full bg-[#e9f9ef] px-2.5 py-1 font-semibold text-green-700">
            Completed
          </span>
        ) : task.commentCount > 0 || task.attachmentCount > 0 ? (
          <span className="inline-flex items-center gap-2 text-[#667085]">
            {task.commentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f7fb] px-2 py-1">
                <MessageSquare className="h-3 w-3" />
                {task.commentCount}
              </span>
            )}
            {task.attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f7fb] px-2 py-1">
                <Paperclip className="h-3 w-3" />
                {task.attachmentCount}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[#98a2b3]">No activity</span>
        )}
      </td>
    </tr>
  )
}

export function TaskCard({
  task,
  className,
  onClick,
  onStatusChange,
  canChangeStatus = false,
}: {
  task: Task
  className?: string
  onClick?: () => void
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  canChangeStatus?: boolean
}) {
  const assignee = resolveAssignee(task)

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-[#e6e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        'transition-shadow hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
          {shortTaskId(task.id)}
        </span>
        <StatusBadge status={task.priority} />
      </div>
      <h4 className="mt-2 text-sm font-semibold leading-snug text-[#111827]">{task.title}</h4>
      {task.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label}
              className="rounded-md bg-[#f5f7fb] px-1.5 py-0.5 text-[10px] font-medium text-[#667085]"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {assignee && (
            <Avatar
              userId={assignee.id}
              name={`${assignee.firstName} ${assignee.lastName}`}
              src={assignee.avatarUrl}
              size="xs"
            />
          )}
          <span className="truncate text-xs text-[#667085]">{assigneeName(task)}</span>
        </div>
        {task.dueDate && (
          <span className="shrink-0 text-[10px] text-[#98a2b3]">
            Due {formatDate(task.dueDate, { year: undefined })}
          </span>
        )}
      </div>
      {canChangeStatus && onStatusChange && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            value={task.status}
            onChange={(status) => onStatusChange(task.id, status)}
            className="w-full [&>button]:w-full"
          />
        </div>
      )}
      {(task.commentCount > 0 || task.attachmentCount > 0) && (
        <div className="mt-3 flex items-center gap-3 text-[#667085]">
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px]">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px]">
              <Paperclip className="h-3 w-3" />
              {task.attachmentCount}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
