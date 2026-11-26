import { Router } from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getNotifications);
router.patch('/read-all', authenticate, (req, res, next) => {
  req.params.id = 'all';
  return markAsRead(req, res, next);
});
router.patch('/:id/read', authenticate, markAsRead);

export default router;
