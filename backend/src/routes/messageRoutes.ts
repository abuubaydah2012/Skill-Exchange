import { Router } from 'express';
import {
  getConversations,
  getMessagesByConversation,
  sendMessage,
  markConversationAsRead,
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/conversations', getConversations);
router.get('/conversations/:conversationId', getMessagesByConversation);
router.post('/', sendMessage);
router.patch('/conversations/:conversationId/read', markConversationAsRead);

export default router;
