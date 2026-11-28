import { Router } from 'express';
import {
  getPayments,
  createDemoCheckout,
  requestDemoRefund,
  reviewDemoRefund,
} from '../controllers/paymentController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.post('/demo-checkout', createDemoCheckout);
router.post('/:id/refund', requestDemoRefund);
router.patch('/:id/refund/review', requireRole('admin'), reviewDemoRefund);

export default router;
