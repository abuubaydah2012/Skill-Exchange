import { Router } from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  enrollInClass,
  cancelClass,
  completeClass,
} from '../controllers/classController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getClasses);
router.get('/:id', getClassById);
router.post('/', createClass);
router.put('/:id', updateClass);
router.post('/:id/enroll', enrollInClass);
router.patch('/:id/cancel', cancelClass);
router.patch('/:id/complete', completeClass);

export default router;
