export type AvatarColor = {
  bg: string
  border: string
  text: string
}

export const avatarColorOptions: AvatarColor[] = [
  { bg: 'bg-sky-100', border: 'border-sky-200', text: 'text-slate-700' },
  { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-slate-700' },
  { bg: 'bg-violet-100', border: 'border-violet-200', text: 'text-slate-700' },
  { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-slate-700' },
  { bg: 'bg-rose-100', border: 'border-rose-200', text: 'text-slate-700' },
  { bg: 'bg-cyan-100', border: 'border-cyan-200', text: 'text-slate-700' },
  { bg: 'bg-fuchsia-100', border: 'border-fuchsia-200', text: 'text-slate-700' },
  { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-slate-700' },
]

export function getAvatarColorConfig(seed: string): AvatarColor {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColorOptions[Math.abs(hash) % avatarColorOptions.length]
}
