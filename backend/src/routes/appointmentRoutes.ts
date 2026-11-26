import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  getAppointmentsByUser,
} from '../controllers/appointmentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createAppointment);
router.get('/', authenticate, getAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.patch('/:id/status', authenticate, updateAppointmentStatus);
router.patch('/:id/cancel', authenticate, cancelAppointment);
router.get('/user/:userId', authenticate, getAppointmentsByUser);

export default router;
