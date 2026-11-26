import { Router } from 'express';
import {
  getSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsByUser,
} from '../controllers/skillController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getSkills);
router.get('/user/:userId', getSkillsByUser);
router.get('/:id', getSkillById);
router.post('/', authenticate, createSkill);
router.put('/:id', authenticate, updateSkill);
router.delete('/:id', authenticate, deleteSkill);

export default router;
