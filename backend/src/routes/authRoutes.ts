import { Router } from 'express';
import { register, login, getMe, changePassword, checkEmailAvailability } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/check-email', checkEmailAvailability);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

export default router;
