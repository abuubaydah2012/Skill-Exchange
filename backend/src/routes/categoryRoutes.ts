import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getCategorySuggestions,
  createCategorySuggestion,
  reviewCategorySuggestion,
} from '../controllers/categoryController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public/shared category listing
router.get('/', getCategories);

// Suggestions (authenticated users can submit & view their own; admins see all)
router.get('/suggestions', authenticate, getCategorySuggestions);
router.post('/suggestions', authenticate, createCategorySuggestion);
router.patch('/suggestions/:id/review', authenticate, requireRole('admin'), reviewCategorySuggestion);

// Admin category & subcategory management
router.post('/', authenticate, requireRole('admin'), createCategory);
router.put('/:id', authenticate, requireRole('admin'), updateCategory);
router.delete('/:id', authenticate, requireRole('admin'), deleteCategory);

router.post('/:id/subcategories', authenticate, requireRole('admin'), createSubcategory);
router.put('/subcategories/:subId', authenticate, requireRole('admin'), updateSubcategory);
router.delete('/subcategories/:subId', authenticate, requireRole('admin'), deleteSubcategory);

export default router;
