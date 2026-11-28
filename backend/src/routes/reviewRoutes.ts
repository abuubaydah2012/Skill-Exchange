import { Router } from 'express';
import {
  createReview,
  getReviewsByUser,
  getMyReviews,
  flagReview,
  moderateReview,
} from '../controllers/reviewController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/my', authenticate, getMyReviews);
router.get('/user/:userId', getReviewsByUser);
router.patch('/:id/flag', authenticate, flagReview);
router.patch('/:id/moderate', authenticate, requireRole('admin'), moderateReview);

export default router;
