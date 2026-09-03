import {
  Building2,
  CircleDollarSign,
  Globe,
  Monitor,
  Server,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type ProjectIconColor = 'orange' | 'blue' | 'purple' | 'green' | 'pink' | 'slate'

export const projectIconOptions: {
  icon: LucideIcon
  color: ProjectIconColor
}[] = [
  { icon: Globe, color: 'orange' },
  { icon: Users, color: 'green' },
  { icon: Building2, color: 'pink' },
  { icon: CircleDollarSign, color: 'green' },
  { icon: Server, color: 'purple' },
  { icon: Monitor, color: 'blue' },
  { icon: Smartphone, color: 'blue' },
]

export function getProjectIconConfig(projectId: string) {
  let hash = 0
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return projectIconOptions[Math.abs(hash) % projectIconOptions.length]
}
