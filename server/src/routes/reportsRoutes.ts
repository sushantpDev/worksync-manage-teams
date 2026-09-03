import { Router } from 'express'
import * as reportsController from '../controllers/reportsController'
import { authenticate, authorize, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant, authorize('admin', 'manager'))
router.get('/', reportsController.getReports)

export default router
