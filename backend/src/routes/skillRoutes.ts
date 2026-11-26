import { Router } from 'express';
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsByUser,
} from '../controllers/skillController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getSkills);
router.post('/', authenticate, createSkill);
router.put('/:id', authenticate, updateSkill);
router.delete('/:id', authenticate, deleteSkill);
router.get('/user/:userId', getSkillsByUser);

export default router;
