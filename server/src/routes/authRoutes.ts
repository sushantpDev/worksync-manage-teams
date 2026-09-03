import { Router } from 'express'
import * as authController from '../controllers/authController'
import { handleAvatarUpload } from '../middleware/avatarUpload'
import { authenticate } from '../middleware/auth'
import { optionalAuthenticate } from '../middleware/optionalAuth'
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  resetPasswordRateLimiter,
} from '../middleware/rateLimiters'

const router = Router()

router.post('/register', registerRateLimiter, authController.register)
router.post('/login', loginRateLimiter, authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', optionalAuthenticate, authController.logout)
router.post('/forgot-password', forgotPasswordRateLimiter, authController.forgotPassword)
router.post('/reset-password', resetPasswordRateLimiter, authController.resetPassword)
router.get('/me', authenticate, authController.getMe)
router.patch('/me', authenticate, authController.updateMe)
router.patch('/change-password', authenticate, authController.changePassword)
router.post('/avatar', authenticate, handleAvatarUpload, authController.uploadAvatar)
router.delete('/avatar', authenticate, authController.deleteAvatar)

export default router
