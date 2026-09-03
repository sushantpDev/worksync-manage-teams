import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { getAvatarColorConfig } from '../../lib/avatarColors'

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Avatar({
  userId,
  name,
  src,
  size = 'md',
  className,
  loading = false,
}: {
  userId?: string
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  loading?: boolean
}) {
  const displayName = name?.trim() || 'User'
  const avatarSrc = src
  const initials = initialsFromName(displayName)
  const colorSeed = userId ?? displayName
  const colors = getAvatarColorConfig(colorSeed)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [avatarSrc])

  const showImage = Boolean(avatarSrc) && !imageFailed

  const sizes = {
    xs: 'h-7 w-7 text-[11px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  }

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full border font-semibold',
        sizes[size],
        avatarSrc ? 'border-border-subtle bg-surface' : cn(colors.bg, colors.border, colors.text),
        loading && 'opacity-70',
        className
      )}
      title={displayName}
    >
      {loading && (
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/10"
          aria-hidden="true"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        </span>
      )}
      {showImage ? (
        <img
          src={avatarSrc}
          alt={displayName}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}

export function AvatarGroup({
  userIds,
  members,
  max = 3,
  size = 'sm',
}: {
  userIds?: string[]
  members?: { id: string; firstName: string; lastName: string; avatarUrl?: string }[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
}) {
  type Entry = { id: string; firstName: string; lastName: string; avatarUrl?: string }

  const entries: Entry[] =
    members && members.length > 0
      ? members
      : (userIds ?? []).map((id) => ({ id, firstName: '', lastName: '' }))

  const visible = entries.slice(0, max)
  const remaining = entries.length - max
  const overflowColors = getAvatarColorConfig(`${entries.length}-overflow`)

  return (
    <div className="flex -space-x-2">
      {visible.map((entry) => {
        const fullName = `${entry.firstName} ${entry.lastName}`.trim()
        return (
          <Avatar
            key={entry.id}
            userId={entry.id}
            name={fullName || undefined}
            src={entry.avatarUrl}
            size={size}
            className="ring-2 ring-card"
          />
        )
      })}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full border font-semibold ring-2 ring-card',
            overflowColors.bg,
            overflowColors.border,
            overflowColors.text,
            size === 'xs' ? 'h-7 w-7 text-[10px]' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-xs'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
