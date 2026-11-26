import { Router } from 'express';
import { getUsers, getUserById, updateProfile, deleteUser } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/profile', authenticate, updateProfile);
router.delete('/:id', authenticate, requireRole('admin'), deleteUser);

export default router;
