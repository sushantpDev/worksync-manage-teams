import { Router } from 'express'
import * as dashboardController from '../controllers/dashboardController'
import { authenticate, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)
router.get('/', dashboardController.getDashboard)
router.get('/stats', dashboardController.getDashboardStats)

export default router
