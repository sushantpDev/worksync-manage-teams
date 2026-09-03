import { Router } from 'express'
import * as commentController from '../controllers/commentController'
import { authenticate, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)

router.get('/', commentController.listComments)
router.get('/:id', commentController.getComment)
router.post('/', commentController.createComment)
router.patch('/:id', commentController.updateComment)
router.delete('/:id', commentController.deleteComment)

export default router
