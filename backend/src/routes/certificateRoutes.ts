import { Router } from 'express';
import {
  createCertificate,
  getCertificatesByUser,
  deleteCertificate,
} from '../controllers/certificateController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createCertificate);
router.get('/user/:userId', getCertificatesByUser);
router.delete('/:id', authenticate, deleteCertificate);

export default router;
