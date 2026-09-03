import { Router } from 'express'
import * as notificationController from '../controllers/notificationController'
import { authenticate, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)

router.get('/', notificationController.listNotifications)
router.patch('/read-all', notificationController.markAllNotificationsRead)
router.patch('/:id/read', notificationController.markNotificationRead)

export default router
