import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, FolderKanban, Plus, Sparkles, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ProjectFormModal } from '../components/projects/ProjectFormModal'
import { ArchiveProjectModal } from '../components/projects/ArchiveProjectModal'
import { DeleteProjectModal } from '../components/projects/DeleteProjectModal'
import { ProjectActionsMenu } from '../components/projects/ProjectActionsMenu'
import { MobileNavToggle } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import { AddProjectCard } from '../components/ui/KpiCard'
import { FilterDropdown, ViewModeToggle } from '../components/ui/FilterDropdown'
import { SearchBar } from '../components/ui/SearchBar'
import { ProjectCard, ProjectTableRow } from '../components/ui/ProjectCard'
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
} from '../components/ui/DataTable'
import { EmptyState, LoadingState } from '../components/ui/State'
import { useAuth } from '../context/AuthContext'
import { ApiError, projectsApi, teamsApi } from '../lib/api'
import { canArchiveProject, canCreateProject, canDeleteProject } from '../lib/permissions'
import type { Project, Team } from '../types'

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const sortOptions = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'progress', label: 'Progress' },
  { value: 'due', label: 'Due Date' },
]

function ProjectsHeroVisual({ projects }: { projects: Project[] }) {
  const previewProjects = projects.slice(0, 3)
  const averageProgress =
    projects.length > 0
      ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
      : 0

  return (
    <div className="relative flex min-h-[205px] items-center justify-center overflow-hidden px-5 py-6">
      <div className="absolute right-10 top-7 h-28 w-28 rounded-full bg-[#79d8ff]" />
      <div className="absolute bottom-5 left-7 h-24 w-24 rotate-12 rounded-[1.5rem] bg-white/45" />
      <div className="absolute right-8 top-14 h-44 w-44 rotate-12 border border-[#8b5cf6]" />

      <div className="relative w-full max-w-[390px] rounded-2xl bg-white p-3.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
        <div className="flex items-center justify-between border-b border-[#eef0f4] pb-2.5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
              Project command
            </p>
            <p className="mt-1 text-sm font-semibold text-[#111827]">
              {projects.length} projects tracked
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e0f2fe] text-[#0369a1]">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={2.2} />
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-[#f8fafc] p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#344054]">Portfolio progress</p>
            <p className="text-xl font-semibold text-[#111827]">{averageProgress}%</p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[#111827]"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>

        <div className="mt-2.5 space-y-1.5">
          {(previewProjects.length > 0 ? previewProjects : [{ id: 'empty', name: 'Create your first project', status: 'planning', progress: 0 } as Project]).map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#eef0f4] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">{project.name}</p>
                <p className="mt-0.5 text-xs capitalize text-[#667085]">
                  {project.status.replace('_', ' ')}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#ede4ff] px-2 py-1 text-[11px] font-semibold text-[#6d45c2]">
                {project.progress}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectStatTile({
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
    <article className="bg-white px-7 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
            {label}
          </p>
          <p className="mt-4 text-[2rem] font-semibold leading-none text-[#07111f]">
            {value}
          </p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-6 w-6" strokeWidth={2.1} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#667085]">{description}</p>
    </article>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { organization, user } = useAuth()
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const canCreate = canCreateProject(user?.role)
  const canArchive = canArchiveProject(user?.role)
  const canDelete = canDeleteProject(user?.role)
  const showProjectActions = canArchive || canDelete

  const loadProjects = useCallback(async () => {
    if (!organization?.id) {
      setProjects([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [data, teamData] = await Promise.all([
        projectsApi.list(),
        teamsApi.list(organization.id),
      ])
      setProjects(data)
      setTeams(teamData)
    } catch (err) {
      setProjects([])
      setTeams([])
      setError(err instanceof ApiError ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const teamOptions = useMemo(() => {
    const teamMap = new Map(teams.map((t) => [t.id, t.name]))
    const assignedTeamIds = [
      ...new Set(projects.flatMap((p) => p.teamIds ?? []).filter(Boolean)),
    ] as string[]
    return [
      { value: 'all', label: 'All Teams' },
      ...assignedTeamIds.map((id) => ({
        value: id,
        label: teamMap.get(id) ?? `Team ${id.slice(-4)}`,
      })),
    ]
  }, [projects, teams])

  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter)
    }

    if (teamFilter !== 'all') {
      result = result.filter((p) => p.teamIds?.includes(teamFilter))
    }

    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'progress':
        result.sort((a, b) => b.progress - a.progress)
        break
      case 'due':
        result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        break
      default:
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }

    return result
  }, [projects, search, statusFilter, teamFilter, sortBy])

  function handleProjectCreated(project: Project) {
    setProjects((prev) => [project, ...prev])
  }

  function handleProjectArchived(updated: Project) {
    setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)))
  }

  function handleProjectDeleted(projectId: string) {
    setProjects((prev) => prev.filter((project) => project.id !== projectId))
  }

  function renderProjectActions(project: Project) {
    if (!showProjectActions) return undefined

    return (
      <ProjectActionsMenu
        showArchive={canArchive && project.status !== 'archived'}
        showDelete={canDelete}
        onArchive={() => setArchiveTarget(project)}
        onDelete={() => setDeleteTarget(project)}
      />
    )
  }

  function openCreateModal() {
    if (canCreate) setModalOpen(true)
  }

  const activeCount = projects.filter((project) => project.status === 'active').length
  const completedCount = projects.filter((project) => project.status === 'completed').length
  const planningCount = projects.filter((project) => project.status === 'planning').length
  const averageProgress =
    projects.length > 0
      ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
      : 0

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
              Projects
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage and track all projects across your organization.
            </p>
          </div>
        </div>

        {canCreate && (
          <Button size="md" className="rounded-full px-4" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        )}
      </div>

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#e1e4ea] bg-white">
        <div className="grid bg-[#e9ddff] lg:grid-cols-[1fr_0.85fr]">
          <div className="px-7 py-7 sm:px-9 lg:px-10 lg:py-9">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#667085]">
              Project operations
            </p>
            <h2 className="mt-4 max-w-[620px] text-[1.85rem] font-bold leading-[1.12] text-[#07111f] sm:text-[2.25rem]">
              Bring timelines, owners, and delivery health into one view
            </h2>
            <p className="mt-4 max-w-[650px] text-[15px] leading-7 text-[#344054]">
              Plan new initiatives, monitor delivery risk, and keep every team aligned
              without switching between scattered project trackers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {canCreate && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#111827] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.2} />
                  Add project
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#111827] bg-transparent px-5 text-sm font-semibold text-[#111827] transition-colors hover:bg-white/50"
              >
                Explore grid
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <ProjectsHeroVisual projects={projects} />
        </div>

        <div className="grid gap-px bg-[#e6e8ee] sm:grid-cols-2 xl:grid-cols-4">
          <ProjectStatTile
            label="Total projects"
            value={projects.length}
            description={`${filteredProjects.length} match the current filters`}
            icon={FolderKanban}
            tone="bg-[#e0f2fe] text-[#0369a1]"
          />
          <ProjectStatTile
            label="Active work"
            value={activeCount}
            description="Projects currently moving through delivery"
            icon={BriefcaseBusiness}
            tone="bg-[#dcfce7] text-[#15803d]"
          />
          <ProjectStatTile
            label="Completed"
            value={completedCount}
            description={`${planningCount} projects are still in planning`}
            icon={CheckCircle2}
            tone="bg-[#ede4ff] text-[#6d45c2]"
          />
          <ProjectStatTile
            label="Avg progress"
            value={`${averageProgress}%`}
            description="Average completion across your portfolio"
            icon={Clock3}
            tone="bg-[#fff3c4] text-[#9a5b00]"
          />
        </div>
      </section>

      {loading && <LoadingState message="Loading projects..." />}

      {!loading && error && (
        <EmptyState
          title="Could not load projects"
          description={error}
          actionLabel="Try again"
          onAction={loadProjects}
        />
      )}

      {!loading && !error && projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking work in this organization."
          actionLabel={canCreate ? 'Add Project' : undefined}
          onAction={canCreate ? openCreateModal : undefined}
        />
      )}

      {!loading && !error && projects.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[#e1e4ea] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#eef1f5] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <SearchBar
              placeholder="Search projects..."
              value={search}
              onChange={setSearch}
              className="w-full max-w-md"
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <FilterDropdown
                label="Status"
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />
              <FilterDropdown
                label="Team"
                value={teamFilter}
                options={teamOptions}
                onChange={setTeamFilter}
              />
              <FilterDropdown
                label="Sort"
                value={sortBy}
                options={sortOptions}
                onChange={setSortBy}
              />
              <ViewModeToggle
                value={viewMode}
                onChange={(mode) => setViewMode(mode as 'grid' | 'table')}
                options={[
                  { value: 'table', label: 'Table' },
                  { value: 'grid', label: 'Grid' },
                ]}
              />
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  actions={renderProjectActions(project)}
                />
              ))}
              {canCreate && <AddProjectCard onClick={openCreateModal} />}
            </div>
          ) : (
            <DataTable className="rounded-none border-0" tableClassName="min-w-[980px]">
              <DataTableHead>
                <DataTableHeaderCell>Project</DataTableHeaderCell>
                <DataTableHeaderCell>Owner</DataTableHeaderCell>
                <DataTableHeaderCell>Team</DataTableHeaderCell>
                <DataTableHeaderCell>Progress</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Start</DataTableHeaderCell>
                <DataTableHeaderCell>Due</DataTableHeaderCell>
                <DataTableHeaderCell>Tasks</DataTableHeaderCell>
                <DataTableHeaderCell>Updated</DataTableHeaderCell>
                {showProjectActions && <DataTableHeaderCell>Actions</DataTableHeaderCell>}
              </DataTableHead>
              <DataTableBody>
                {filteredProjects.map((project) => (
                  <ProjectTableRow
                    key={project.id}
                    project={project}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    actions={renderProjectActions(project)}
                  />
                ))}
              </DataTableBody>
            </DataTable>
          )}

          {filteredProjects.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-text-secondary">
              No projects match your filters.
            </p>
          )}
        </section>
      )}

      {canCreate && (
        <ProjectFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleProjectCreated}
        />
      )}

      <ArchiveProjectModal
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        project={archiveTarget}
        onSuccess={handleProjectArchived}
      />

      <DeleteProjectModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        project={deleteTarget}
        onSuccess={handleProjectDeleted}
      />
    </div>
  )
}
