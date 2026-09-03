import { Router } from 'express'
import * as projectController from '../controllers/projectController'
import { authenticate, authorize, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)

router.get('/', projectController.listProjects)
router.get('/:id', projectController.getProject)
router.post('/', authorize('admin', 'manager'), projectController.createProject)
router.patch('/:id/team', authorize('admin', 'manager'), projectController.updateProjectTeam)
router.patch('/:id', authorize('admin', 'manager'), projectController.updateProject)
router.delete('/:id', authorize('admin'), projectController.deleteProject)

export default router
