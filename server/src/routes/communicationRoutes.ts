import { Router } from 'express'
import * as communicationController from '../controllers/communicationController'
import { handleCommunicationAttachmentUpload } from '../middleware/communicationAttachmentUpload'
import { authenticate, resolveTenant } from '../middleware/auth'

const router = Router()

router.use(authenticate, resolveTenant)

router.get('/sidebar', communicationController.getSidebar)
router.get('/unread-total', communicationController.getUnreadTotal)

router.get('/teams/:teamId/channels', communicationController.listTeamChannels)
router.post('/teams/:teamId/channels', communicationController.createChannel)

router.patch('/channels/:channelId', communicationController.updateChannel)
router.delete('/channels/:channelId', communicationController.deleteChannel)
router.get('/channels/:channelId/messages', communicationController.listChannelMessages)
router.get(
  '/channels/:channelId/mention-candidates',
  communicationController.getChannelMentionCandidates
)
router.post(
  '/channels/:channelId/messages',
  handleCommunicationAttachmentUpload,
  communicationController.sendChannelMessage
)
router.post('/channels/:channelId/read', communicationController.markChannelRead)

router.post('/direct', communicationController.startDirectConversation)
router.get('/conversations/:conversationId/messages', communicationController.listConversationMessages)
router.post(
  '/conversations/:conversationId/messages',
  handleCommunicationAttachmentUpload,
  communicationController.sendConversationMessage
)
router.post('/conversations/:conversationId/read', communicationController.markConversationRead)

router.patch('/messages/:messageId', communicationController.editMessage)
router.delete('/messages/:messageId', communicationController.deleteMessage)
router.get(
  '/messages/:messageId/attachments/:attachmentId/download',
  communicationController.downloadMessageAttachment
)
router.post('/messages/:messageId/reactions', communicationController.addReaction)
router.delete('/messages/:messageId/reactions/:emoji', communicationController.removeReaction)

export default router
