import { Router } from 'express'
import * as activityController from '../controllers/activityController'
import { authenticate, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)

router.get('/', activityController.listActivities)
router.get('/:id', activityController.getActivity)

export default router
