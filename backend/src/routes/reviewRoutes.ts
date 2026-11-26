import { Router } from 'express';
import { createReview, getReviewsByUser } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/user/:userId', getReviewsByUser);

export default router;
