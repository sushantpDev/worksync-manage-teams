import { Building2, Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

export function OrganizationSwitcher({ onClose }: { onClose?: () => void }) {
  const { organization, organizations, switchOrganization, createOrganization } = useAuth()
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSwitch(orgId: string) {
    if (orgId === organization?.id) return
    setBusy(true)
    setError(null)
    try {
      await switchOrganization(orgId)
      onClose?.()
    } catch {
      setError('Unable to switch organization')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createOrganization(newOrgName.trim())
      setNewOrgName('')
      setCreating(false)
      onClose?.()
    } catch {
      setError('Unable to create organization')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 border-b border-border/40 pb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Organization
      </p>

      <div className="max-h-40 space-y-1 overflow-y-auto">
        {organizations.map(({ organization: org, role }) => (
          <button
            key={org.id}
            type="button"
            disabled={busy}
            onClick={() => handleSwitch(org.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-card-muted',
              organization?.id === org.id && 'bg-card-muted'
            )}
          >
            <Building2 className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{org.name}</span>
            <span className="shrink-0 text-[10px] capitalize text-text-muted">{role}</span>
            {organization?.id === org.id && (
              <Check className="h-3.5 w-3.5 shrink-0 text-text-primary" strokeWidth={2} />
            )}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {creating ? (
        <form onSubmit={handleCreate} className="mt-3 space-y-2">
          <input
            type="text"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Organization name"
            className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent-purple/20"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !newOrgName.trim()}
              className="flex-1 rounded-lg bg-text-primary py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-secondary transition-colors hover:bg-card-muted hover:text-text-primary"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Create organization
        </button>
      )}
    </div>
  )
}
