import { Router } from 'express';
import {
  getConversations,
  getOrCreateAppointmentConversation,
  getMessagesByConversation,
  sendMessage,
  markConversationAsRead,
  deleteConversationForUser,
  searchTeachers,
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/teachers', searchTeachers);
router.get('/conversations', getConversations);
router.post('/conversations/appointment', getOrCreateAppointmentConversation);
router.get('/conversations/:conversationId', getMessagesByConversation);
router.post('/', sendMessage);
router.patch('/conversations/:conversationId/read', markConversationAsRead);
router.delete('/conversations/:conversationId', deleteConversationForUser);

export default router;
