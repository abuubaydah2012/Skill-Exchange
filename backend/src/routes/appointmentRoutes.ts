import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  cancelAppointment,
  getAppointmentsByUser,
} from '../controllers/appointmentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createAppointment);
router.get('/', authenticate, getAppointments);
router.get('/user/:userId', authenticate, getAppointmentsByUser);
router.get('/:id', authenticate, getAppointmentById);
router.patch('/:id/status', authenticate, updateAppointmentStatus);
router.patch('/:id/accept', authenticate, acceptAppointment);
router.patch('/:id/reject', authenticate, rejectAppointment);
router.patch('/:id/complete', authenticate, completeAppointment);
router.patch('/:id/cancel', authenticate, cancelAppointment);

export default router;
