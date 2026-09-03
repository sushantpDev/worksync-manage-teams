import { Router } from 'express'
import * as invitationController from '../controllers/invitationController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.get('/:token', invitationController.getInvitationByToken)
router.post('/:token/accept', authenticate, invitationController.acceptInvitation)

export default router
