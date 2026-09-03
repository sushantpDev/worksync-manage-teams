import type { OrganizationMember, Team } from '../../types'
import { Modal } from '../ui/Modal'
import { TeamMembersPanel } from './TeamMembersPanel'

export function ManageTeamMembersModal({
  open,
  onClose,
  organizationId,
  team,
  orgMembers,
  onTeamUpdated,
}: {
  open: boolean
  onClose: () => void
  organizationId: string
  team: Team | null
  orgMembers: OrganizationMember[]
  onTeamUpdated: (team: Team) => void
}) {
  if (!team) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage team"
      description={team.name}
      size="lg"
    >
      <TeamMembersPanel
        organizationId={organizationId}
        team={team}
        orgMembers={orgMembers}
        canManage
        enabled={open}
        onTeamUpdated={onTeamUpdated}
      />
    </Modal>
  )
}
