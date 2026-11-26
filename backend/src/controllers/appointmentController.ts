import { Request, Response, NextFunction } from 'express';
import { Appointment } from '../models/Appointment.js';
import { Skill } from '../models/Skill.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const createAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const {
      teacherId,
      skillId,
      skillName,
      requestedDate,
      appointmentDate,
      startTime,
      durationMinutes = 60,
      duration,
      isFreeSwap = true,
      offeredSwapSkillName,
      hourlyPrice = 0,
      totalCost = 0,
      price,
      message = '',
      appointmentType,
    } = req.body;

    const finalDate = requestedDate || appointmentDate;
    const finalDuration = durationMinutes || duration || 60;

    if (!teacherId || !skillId || !finalDate || !startTime) {
      res.status(400).json({
        success: false,
        message: 'Teacher, skill, date, and start time are required to book an appointment.',
      });
      return;
    }

    // Prevent booking appointment with oneself
    if (teacherId === req.user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot book an appointment with yourself.',
      });
      return;
    }

    // Securely retrieve and validate target skill from database
    const targetSkill = await Skill.findById(skillId);
    if (!targetSkill) {
      res.status(404).json({
        success: false,
        message: 'The requested skill was not found in the catalog.',
      });
      return;
    }

    if (targetSkill.userId.toString() !== teacherId.toString()) {
      res.status(400).json({
        success: false,
        message: 'The requested skill does not belong to the specified instructor.',
      });
      return;
    }

    // Securely retrieve and validate teacher
    const targetTeacher = await User.findById(teacherId);
    if (!targetTeacher || targetTeacher.isSuspended) {
      res.status(404).json({
        success: false,
        message: 'The requested instructor was not found or is currently unavailable.',
      });
      return;
    }

    // Securely compute pricing on backend (never trust client-sent price)
    let finalHourlyPrice = 0;
    let finalTotalCost = 0;
    const isFree = Boolean(isFreeSwap);

    if (isFree) {
      if (!targetSkill.freeSwapAvailable) {
        res.status(400).json({
          success: false,
          message: 'This skill is not currently available for free skill swaps.',
        });
        return;
      }
      finalHourlyPrice = 0;
      finalTotalCost = 0;
    } else {
      if (!targetSkill.paidLessonAvailable) {
        res.status(400).json({
          success: false,
          message: 'This skill is not currently offered as a paid lesson.',
        });
        return;
      }
      finalHourlyPrice = targetSkill.hourlyPrice;
      finalTotalCost = Math.round((targetSkill.hourlyPrice * (finalDuration / 60)) * 100) / 100;
    }

    const appointment = await Appointment.create({
      learnerId: req.user._id,
      teacherId,
      skillId,
      skillName: targetSkill.name,
      requestedDate: finalDate,
      startTime,
      durationMinutes: finalDuration,
      isFreeSwap: isFree,
      offeredSwapSkillName,
      hourlyPrice: finalHourlyPrice,
      totalCost: finalTotalCost,
      message,
      appointmentType: isFree ? 'Free' : 'Paid',
      meetingId: `meet-${Math.random().toString(36).substring(2, 9)}`,
    });

    // Notify teacher of the incoming request
    await Notification.create({
      userId: teacherId,
      title: 'New Appointment Request',
      message: `${req.user.name} requested a ${isFree ? 'Free Swap' : 'Paid'} session for "${targetSkill.name}" on ${finalDate}.`,
      category: 'Appointments',
      relatedAppointmentId: appointment._id,
      actionUrl: '/appointments',
    });

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { status, role } = req.query;
    const filter: Record<string, unknown> = {};

    if (req.user.role === 'admin' && !role) {
      // Admin sees all appointments
    } else if (role === 'teacher') {
      filter.teacherId = req.user._id;
    } else if (role === 'learner') {
      filter.learnerId = req.user._id;
    } else {
      filter.$or = [{ learnerId: req.user._id }, { teacherId: req.user._id }];
    }

    if (status && typeof status === 'string' && status !== 'All') {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('learnerId', 'name email avatarUrl avatarBgColor phoneNumber')
      .populate('teacherId', 'name email avatarUrl avatarBgColor phoneNumber')
      .populate('skillId', 'name category proficiency hourlyPrice')
      .sort({ requestedDate: -1, startTime: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointmentById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate('learnerId', 'name email avatarUrl avatarBgColor')
      .populate('teacherId', 'name email avatarUrl avatarBgColor');

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    // Authorization check
    const userId = req.user?._id.toString();
    const isParticipant =
      appointment.learnerId._id.toString() === userId ||
      appointment.teacherId._id.toString() === userId ||
      req.user?.role === 'admin';

    if (!isParticipant) {
      res.status(403).json({ success: false, message: 'Unauthorized to view this appointment.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const validStatuses = ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Status must be one of: ${validStatuses.join(', ')}.`,
      });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    const userId = req.user?._id.toString();
    const isTeacher = appointment.teacherId.toString() === userId;
    const isLearner = appointment.learnerId.toString() === userId;
    const isAdmin = req.user?.role === 'admin';

    // Role-based status authorization:
    if (status === 'Accepted' || status === 'Rejected') {
      if (!isTeacher && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Only the designated instructor or administrator can accept or reject an appointment request.',
        });
        return;
      }
    } else if (status === 'Completed') {
      if (!isTeacher && !isLearner && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Only session participants or administrators can complete an appointment.',
        });
        return;
      }
    } else if (status === 'Cancelled') {
      if (!isTeacher && !isLearner && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Only appointment participants or administrators can cancel this session.',
        });
        return;
      }
    }

    const previousStatus = appointment.status;

    // Idempotency check: if appointment is already completed, return without re-incrementing counters
    if (status === 'Completed') {
      if (previousStatus === 'Completed') {
        res.status(200).json({
          success: true,
          message: 'Appointment has already been completed.',
          data: appointment,
        });
        return;
      }
      if (previousStatus === 'Cancelled' || previousStatus === 'Rejected') {
        res.status(400).json({
          success: false,
          message: `Cannot complete an appointment that was previously ${previousStatus.toLowerCase()}.`,
        });
        return;
      }
    }

    if ((status === 'Accepted' || status === 'Rejected') && (previousStatus === 'Completed' || previousStatus === 'Cancelled')) {
      res.status(400).json({
        success: false,
        message: `Cannot change status to ${status} on an appointment that is already ${previousStatus.toLowerCase()}.`,
      });
      return;
    }

    appointment.status = status;
    if (cancellationReason) {
      appointment.cancellationReason = cancellationReason;
    }
    await appointment.save();

    // If transitioned to Completed, increment completed sessions count for both participants exactly once
    if (status === 'Completed' && previousStatus !== 'Completed') {
      await User.updateMany(
        { _id: { $in: [appointment.learnerId, appointment.teacherId] } },
        { $inc: { completedSessionsCount: 1 } }
      );
    }

    // Notify the other party of status change
    const targetUserId = isTeacher ? appointment.learnerId : appointment.teacherId;
    await Notification.create({
      userId: targetUserId,
      title: `Appointment ${status}`,
      message: `Your appointment for ${appointment.skillName} scheduled for ${appointment.requestedDate} is now ${status.toLowerCase()}.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`,
      category: 'Appointments',
      relatedAppointmentId: appointment._id,
      actionUrl: '/appointments',
    });

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  req.body.status = 'Accepted';
  return updateAppointmentStatus(req, res, next);
};

export const rejectAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  req.body.status = 'Rejected';
  return updateAppointmentStatus(req, res, next);
};

export const completeAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  req.body.status = 'Completed';
  return updateAppointmentStatus(req, res, next);
};

export const cancelAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    const userId = req.user?._id.toString();
    const isParticipant =
      appointment.learnerId.toString() === userId ||
      appointment.teacherId.toString() === userId ||
      req.user?.role === 'admin';

    if (!isParticipant) {
      res.status(403).json({ success: false, message: 'Unauthorized to cancel this appointment.' });
      return;
    }

    appointment.status = 'Cancelled';
    appointment.cancellationReason = reason;
    await appointment.save();

    // Notify the other party
    const targetUserId = appointment.learnerId.toString() === userId
      ? appointment.teacherId
      : appointment.learnerId;

    await Notification.create({
      userId: targetUserId,
      title: 'Appointment Cancelled',
      message: `The session scheduled for ${appointment.requestedDate} was cancelled. Reason: ${reason}`,
      category: 'Appointments',
      relatedAppointmentId: appointment._id,
      actionUrl: '/appointments',
    });

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointmentsByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const appointments = await Appointment.find({
      $or: [{ learnerId: userId }, { teacherId: userId }],
    })
      .populate('learnerId', 'name avatarUrl')
      .populate('teacherId', 'name avatarUrl')
      .sort({ requestedDate: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};
