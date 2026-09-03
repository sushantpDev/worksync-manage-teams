import { Router } from 'express'
import * as searchController from '../controllers/searchController'
import { authenticate, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)

router.get('/', searchController.globalSearch)

export default router
