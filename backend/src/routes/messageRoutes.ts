import { Router } from 'express';
import {
  getConversations,
  getMessagesByConversation,
  sendMessage,
  markConversationAsRead,
  searchTeachers,
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/teachers', searchTeachers);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId', getMessagesByConversation);
router.post('/', sendMessage);
router.patch('/conversations/:conversationId/read', markConversationAsRead);

export default router;
