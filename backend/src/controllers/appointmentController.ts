import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { Skill } from '../models/Skill.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { emitToUser } from '../socket.js';

const adaptAppointment = (apt: any) => {
  const learnerObj = apt.learnerId;
  const teacherObj = apt.teacherId;
  const skillObj = apt.skillId;

  const lId = learnerObj?._id ? learnerObj._id.toString() : (apt.learnerId ? apt.learnerId.toString() : '');
  const tId = teacherObj?._id ? teacherObj._id.toString() : (apt.teacherId ? apt.teacherId.toString() : '');
  const sId = skillObj?._id ? skillObj._id.toString() : (apt.skillId ? apt.skillId.toString() : '');

  return {
    id: apt._id.toString(),
    learnerId: lId,
    learnerName: apt.learnerName || learnerObj?.name || 'Student',
    learnerAvatarUrl: apt.learnerAvatarUrl || learnerObj?.avatarUrl || '',
    learnerAvatarBgColor: apt.learnerAvatarBgColor || learnerObj?.avatarBgColor || '#0284c7',
    learnerHeadline: apt.learnerHeadline || learnerObj?.headline || '',
    teacherId: tId,
    teacherName: apt.teacherName || teacherObj?.name || 'Instructor',
    teacherAvatarUrl: apt.teacherAvatarUrl || teacherObj?.avatarUrl || '',
    teacherAvatarBgColor: apt.teacherAvatarBgColor || teacherObj?.avatarBgColor || '#059669',
    skillId: sId,
    skillName: apt.skillName || skillObj?.name || 'Skill Session',
    requestedDate: apt.requestedDate,
    startTime: apt.startTime,
    durationMinutes: apt.durationMinutes || 60,
    isFreeSwap: Boolean(apt.isFreeSwap),
    offeredSwapSkillName: apt.offeredSwapSkillName,
    hourlyPrice: apt.hourlyPrice || 0,
    totalCost: apt.totalCost || 0,
    message: apt.message || '',
    status: apt.status,
    rejectionReason: apt.rejectionReason || apt.cancellationReason || '',
    cancellationReason: apt.cancellationReason || apt.rejectionReason || '',
    createdAt: apt.createdAt ? (apt.createdAt instanceof Date ? apt.createdAt.toISOString() : new Date(apt.createdAt).toISOString()) : new Date().toISOString(),
    meetingId: apt.meetingId,
  };
};

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

    if (!teacherId || !finalDate || !startTime) {
      res.status(400).json({
        success: false,
        message: 'Teacher, date, and start time are required to book an appointment.',
      });
      return;
    }

    // Resolve designated teacher strictly
    let targetTeacher = null;
    if (mongoose.Types.ObjectId.isValid(teacherId)) {
      targetTeacher = await User.findById(teacherId);
    }
    if (!targetTeacher && typeof teacherId === 'string') {
      const cleanTeacher = teacherId.trim();
      targetTeacher = await User.findOne({
        $or: [
          { email: cleanTeacher.toLowerCase() },
          { _id: mongoose.Types.ObjectId.isValid(cleanTeacher) ? cleanTeacher : null },
        ].filter(Boolean),
      });
    }

    if (!targetTeacher || targetTeacher.role !== 'teacher' || targetTeacher.isSuspended) {
      res.status(404).json({
        success: false,
        message: 'The requested instructor was not found or is currently unavailable.',
      });
      return;
    }

    // Prevent booking appointment with oneself
    if (targetTeacher._id.toString() === req.user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot book an appointment with yourself.',
      });
      return;
    }

    // Resolve or auto-ensure skill
    let targetSkill = null;
    if (skillId && mongoose.Types.ObjectId.isValid(skillId)) {
      targetSkill = await Skill.findById(skillId);
    }
    if (!targetSkill) {
      targetSkill = await Skill.findOne({
        userId: targetTeacher._id,
        ...(skillName ? { name: { $regex: new RegExp(skillName, 'i') } } : {}),
      });
    }
    if (!targetSkill) {
      // Auto-create skill for instructor if catalog entry missing
      targetSkill = await Skill.create({
        userId: targetTeacher._id,
        name: skillName || 'Skill Exchange Session',
        category: 'Development',
        description: `Instruction session for ${skillName || 'Skill Exchange'}`,
        proficiency: 'Expert',
        skillType: 'Teaching',
        freeSwapAvailable: Boolean(isFreeSwap),
        paidLessonAvailable: !isFreeSwap,
        hourlyPrice: hourlyPrice || 0,
      });
    }

    // Compute pricing
    let finalHourlyPrice = 0;
    let finalTotalCost = 0;
    const isFree = Boolean(isFreeSwap);

    if (isFree) {
      finalHourlyPrice = 0;
      finalTotalCost = 0;
    } else {
      finalHourlyPrice = targetSkill.hourlyPrice || hourlyPrice || 25;
      finalTotalCost = totalCost || Math.round((finalHourlyPrice * (finalDuration / 60)) * 100) / 100;
    }

    const appointment = await Appointment.create({
      learnerId: req.user._id,
      learnerName: req.user.name,
      learnerAvatarUrl: req.user.avatarUrl || '',
      learnerAvatarBgColor: req.user.avatarBgColor || '#0284c7',
      learnerHeadline: req.user.headline || '',
      teacherId: targetTeacher._id,
      teacherName: targetTeacher.name,
      teacherAvatarUrl: targetTeacher.avatarUrl || '',
      teacherAvatarBgColor: targetTeacher.avatarBgColor || '#059669',
      skillId: targetSkill._id,
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
      status: 'Pending',
      meetingId: `meet-${Math.random().toString(36).substring(2, 9)}`,
    });

    // Notify teacher of the incoming request
    const teacherNotif = await Notification.create({
      userId: targetTeacher._id,
      title: 'New Appointment Request',
      message: `${req.user.name} requested a ${isFree ? 'Free Swap' : 'Paid'} session for "${targetSkill.name}" on ${finalDate}.`,
      category: 'Appointments',
      relatedAppointmentId: appointment._id,
      actionUrl: '/appointments',
    });

    const adapted = adaptAppointment(appointment);

    // Emit real-time events via Socket.IO to the designated teacher
    emitToUser(targetTeacher._id.toString(), 'appointment:received', adapted);
    emitToUser(targetTeacher._id.toString(), 'notification:received', teacherNotif);

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully.',
      data: adapted,
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

    if (status && typeof status === 'string' && status !== 'All' && status !== 'all') {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('learnerId', 'name email avatarUrl avatarBgColor phoneNumber')
      .populate('teacherId', 'name email avatarUrl avatarBgColor phoneNumber')
      .populate('skillId', 'name category proficiency hourlyPrice')
      .sort({ requestedDate: -1, startTime: -1 });

    const adapted = appointments.map(adaptAppointment);

    res.status(200).json({
      success: true,
      count: adapted.length,
      data: adapted,
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
      data: adaptAppointment(appointment),
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    const previousStatus = appointment.status;
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
      if (previousStatus !== 'Pending') {
        res.status(400).json({
          success: false,
          message: `Cannot change status to ${status}. Only Pending requests can be accepted or rejected (current status is ${previousStatus}).`,
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

    // Idempotency check: if appointment is already completed, return without re-incrementing counters
    if (status === 'Completed') {
      if (previousStatus === 'Completed') {
        res.status(200).json({
          success: true,
          message: 'Appointment has already been completed.',
          data: adaptAppointment(appointment),
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

    appointment.status = status;
    const reasonText = req.body.rejectionReason || req.body.cancellationReason || req.body.reason || cancellationReason || '';
    if (status === 'Rejected') {
      appointment.rejectionReason = reasonText;
      appointment.cancellationReason = reasonText;
    } else if (status === 'Cancelled' && reasonText) {
      appointment.cancellationReason = reasonText;
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
    const notifMessage = status === 'Rejected' && reasonText
      ? `Your appointment request for "${appointment.skillName}" was declined. Reason: ${reasonText}`
      : `Your appointment for "${appointment.skillName}" scheduled for ${appointment.requestedDate} is now ${status.toLowerCase()}.${reasonText ? ` Note: ${reasonText}` : ''}`;

    const notification = await Notification.create({
      userId: targetUserId,
      title: `Appointment ${status}`,
      message: notifMessage,
      category: 'Appointments',
      relatedAppointmentId: appointment._id,
      actionUrl: '/appointments',
    });

    const adapted = adaptAppointment(appointment);

    // Emit real-time updates via Socket.IO
    emitToUser(appointment.learnerId.toString(), 'appointment:updated', adapted);
    emitToUser(appointment.teacherId.toString(), 'appointment:updated', adapted);
    emitToUser(targetUserId.toString(), 'notification:received', notification);

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: adapted,
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    const previousStatus = appointment.status;
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

    const notif = await Notification.create({
      userId: targetUserId,
      title: 'Appointment Cancelled',
      message: `The session scheduled for ${appointment.requestedDate} was cancelled. Reason: ${reason}`,
      category: 'Appointments',
      relatedAppointmentId: appointment._id,
      actionUrl: '/appointments',
    });

    const adapted = adaptAppointment(appointment);

    // Emit real-time updates via Socket.IO
    emitToUser(appointment.learnerId.toString(), 'appointment:updated', adapted);
    emitToUser(appointment.teacherId.toString(), 'appointment:updated', adapted);
    emitToUser(targetUserId.toString(), 'notification:received', notif);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: adapted,
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
      data: appointments.map(adaptAppointment),
    });
  } catch (error) {
    next(error);
  }
};
