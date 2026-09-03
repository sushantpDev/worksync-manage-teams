import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { searchApi } from '../../lib/api'
import type {
  SearchPersonResult,
  SearchProjectResult,
  SearchResponse,
  SearchTaskResult,
} from '../../types'
import { cn, formatDate } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'

type SearchResultItem =
  | { type: 'project'; data: SearchProjectResult }
  | { type: 'task'; data: SearchTaskResult }
  | { type: 'person'; data: SearchPersonResult }

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

function formatProjectStatus(status: SearchProjectResult['status']) {
  return status.replace('_', ' ')
}

function formatTaskStatus(status: SearchTaskResult['status']) {
  return status.replace('_', ' ')
}

function buildFlatResults(response: SearchResponse): SearchResultItem[] {
  return [
    ...response.projects.map((data) => ({ type: 'project' as const, data })),
    ...response.tasks.map((data) => ({ type: 'task' as const, data })),
    ...response.people.map((data) => ({ type: 'person' as const, data })),
  ]
}

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const flatResults = useMemo(
    () => (results ? buildFlatResults(results) : []),
    [results]
  )

  const hasResults =
    (results?.projects.length ?? 0) > 0 ||
    (results?.tasks.length ?? 0) > 0 ||
    (results?.people.length ?? 0) > 0

  const runSearch = useCallback(
    async (value: string) => {
      if (!organization?.id || value.trim().length < MIN_QUERY_LENGTH) {
        setResults(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const data = await searchApi.query(value.trim())
        setResults(data)
        setActiveIndex(-1)
      } catch {
        setResults({ projects: [], tasks: [], people: [] })
        setActiveIndex(-1)
      } finally {
        setLoading(false)
      }
    },
    [organization?.id]
  )

  useEffect(() => {
    setQuery('')
    setResults(null)
    setOpen(false)
    setActiveIndex(-1)
  }, [organization?.id])

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults(null)
      setLoading(false)
      setActiveIndex(-1)
      return
    }

    const timer = window.setTimeout(() => {
      void runSearch(query)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query, runSearch])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function navigateToItem(item: SearchResultItem) {
    if (item.type === 'project') {
      navigate(`/projects/${item.data.id}`)
    } else if (item.type === 'task') {
      navigate(`/projects/${item.data.projectId}`)
    } else {
      navigate('/people')
    }
    setOpen(false)
    setQuery('')
    setResults(null)
    inputRef.current?.blur()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }

    if (!open || flatResults.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % flatResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? flatResults.length - 1 : prev - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const item = flatResults[activeIndex]
      if (item) navigateToItem(item)
    }
  }

  function getFlatIndex(type: SearchResultItem['type'], id: string) {
    return flatResults.findIndex((item) => item.type === type && item.data.id === id)
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH

  return (
    <div ref={containerRef} className={cn('relative w-full min-w-0', className)}>
      <Search
        className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-secondary"
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search projects, tasks, people..."
        aria-label="Search projects, tasks, and people"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        className={cn(
          'h-11 w-full min-w-0 rounded-full border-0 bg-nav-search pl-11 pr-[4.75rem] text-sm',
          'text-text-primary placeholder:text-text-secondary/80',
          'focus:outline-none focus:ring-2 focus:ring-accent-purple/25'
        )}
      />
      <kbd
        className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-black/5 bg-nav-chip-hover/80 px-1.5 py-0.5 text-[11px] font-medium text-text-secondary sm:inline-flex"
      >
        Ctrl+K
      </kbd>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border border-border bg-card py-2 shadow-lg">
          {loading && (
            <p className="px-4 py-3 text-sm text-text-secondary">Searching...</p>
          )}

          {!loading && !hasResults && (
            <p className="px-4 py-3 text-sm text-text-secondary">No results found</p>
          )}

          {!loading && hasResults && results && (
            <>
              {results.projects.length > 0 && (
                <div className="px-2 pb-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Projects
                  </p>
                  {results.projects.map((project) => {
                    const index = getFlatIndex('project', project.id)
                    const active = index === activeIndex
                    return (
                      <button
                        key={project.id}
                        type="button"
                        className={cn(
                          'flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors',
                          active ? 'bg-card-muted' : 'hover:bg-card-muted'
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => navigateToItem({ type: 'project', data: project })}
                      >
                        <span className="text-sm font-medium text-text-primary">{project.name}</span>
                        <span className="mt-0.5 text-xs capitalize text-text-muted">
                          {formatProjectStatus(project.status)} · Due{' '}
                          {formatDate(project.dueDate, { year: undefined })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {results.tasks.length > 0 && (
                <div className="px-2 pb-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Tasks
                  </p>
                  {results.tasks.map((task) => {
                    const index = getFlatIndex('task', task.id)
                    const active = index === activeIndex
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={cn(
                          'flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors',
                          active ? 'bg-card-muted' : 'hover:bg-card-muted'
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => navigateToItem({ type: 'task', data: task })}
                      >
                        <span className="text-sm font-medium text-text-primary">{task.title}</span>
                        <span className="mt-0.5 text-xs text-text-muted">
                          {task.projectName} · {formatTaskStatus(task.status)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {results.people.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    People
                  </p>
                  {results.people.map((person) => {
                    const index = getFlatIndex('person', person.id)
                    const active = index === activeIndex
                    return (
                      <button
                        key={person.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                          active ? 'bg-card-muted' : 'hover:bg-card-muted'
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => navigateToItem({ type: 'person', data: person })}
                      >
                        <Avatar
                          userId={person.id}
                          name={`${person.firstName} ${person.lastName}`}
                          src={person.avatarUrl}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-text-primary">
                            {person.firstName} {person.lastName}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-text-muted">
                            {person.email} · <span className="capitalize">{person.role}</span>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
