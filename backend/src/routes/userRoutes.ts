import { Router } from 'express';
import { getUsers, getUserById, getProfile, updateProfile, deleteUser } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getUsers);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/:id', getUserById);
router.delete('/:id', authenticate, requireRole('admin'), deleteUser);

export default router;
