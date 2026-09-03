import { Router } from 'express'
import * as organizationController from '../controllers/organizationController'
import * as invitationController from '../controllers/invitationController'
import * as teamController from '../controllers/teamController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.post('/', organizationController.createOrganization)
router.get('/', organizationController.listOrganizations)

router.post('/:id/invitations', invitationController.createInvitation)
router.get('/:id/invitations', invitationController.listInvitations)
router.delete('/:id/invitations/:invitationId', invitationController.revokeInvitation)

router.get('/:id/teams', teamController.listTeams)
router.post('/:id/teams', teamController.createTeam)
router.patch('/:id/teams/:teamId', teamController.updateTeam)
router.delete('/:id/teams/:teamId', teamController.deleteTeam)
router.get('/:id/teams/:teamId/members', teamController.listTeamMembers)
router.post('/:id/teams/:teamId/members', teamController.addTeamMember)
router.delete('/:id/teams/:teamId/members/:userId', teamController.removeTeamMember)
router.patch('/:id/teams/:teamId/lead', teamController.updateTeamLead)

router.get('/:id/members', organizationController.listMembers)
router.post('/:id/members', organizationController.addMember)
router.patch('/:id/members/:membershipId', organizationController.updateMemberRole)
router.delete('/:id/members/:membershipId', organizationController.removeMember)
router.post('/:id/switch', organizationController.switchOrganization)
router.patch('/:id', organizationController.updateOrganization)
router.get('/:id', organizationController.getOrganization)

export default router
