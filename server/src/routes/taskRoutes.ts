import { Router } from 'express'
import * as taskController from '../controllers/taskController'
import * as taskAttachmentController from '../controllers/taskAttachmentController'
import { handleTaskAttachmentUpload } from '../middleware/taskAttachmentUpload'
import { authenticate, authorize, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)

router.get('/', taskController.listTasks)
router.get('/:taskId/attachments', taskAttachmentController.listTaskAttachments)
router.post(
  '/:taskId/attachments',
  handleTaskAttachmentUpload,
  taskAttachmentController.uploadTaskAttachment
)
router.delete(
  '/:taskId/attachments/:attachmentId',
  taskAttachmentController.deleteTaskAttachment
)
router.get('/:id', taskController.getTask)
router.post('/', authorize('admin', 'manager'), taskController.createTask)
router.patch('/:id', taskController.updateTask)
router.delete('/:id', authorize('admin', 'manager'), taskController.deleteTask)

export default router
