import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ClassSession } from '../models/ClassSession.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { emitToUser } from '../socket.js';

const adaptClassForUser = (cls: any, viewerId: string, viewerRole: string) => {
  const teacherIdStr = cls.teacherId?._id ? cls.teacherId._id.toString() : cls.teacherId.toString();
  const isHostOrAdmin = teacherIdStr === viewerId || viewerRole === 'admin';
  const rawEnrolled = Array.isArray(cls.enrolledUserIds) ? cls.enrolledUserIds : [];
  const enrolledStrs: string[] = rawEnrolled.map((id: any) =>
    id?._id ? id._id.toString() : id.toString()
  );
  const isEnrolled = enrolledStrs.includes(viewerId);

  // Privacy: never expose other students' IDs to another student
  const visibleEnrolledUserIds = isHostOrAdmin
    ? enrolledStrs
    : isEnrolled
    ? [viewerId]
    : [];

  const enrolledStudents = isHostOrAdmin
    ? rawEnrolled
        .filter((u: any) => typeof u === 'object' && u !== null && u._id)
        .map((u: any) => ({
          id: u._id.toString(),
          name: u.name || 'Student',
          email: u.email || '',
          avatarUrl: u.avatarUrl || '',
          avatarBgColor: u.avatarBgColor || '#0284c7',
        }))
    : undefined;

  return {
    id: cls._id.toString(),
    teacherId: teacherIdStr,
    teacherName: cls.teacherName,
    title: cls.title,
    skillName: cls.skillName,
    category: cls.category,
    description: cls.description,
    dateTime: cls.dateTime ? new Date(cls.dateTime).toISOString() : new Date().toISOString(),
    durationMinutes: cls.durationMinutes,
    capacity: cls.capacity,
    enrolledCount: enrolledStrs.length,
    enrolledUserIds: visibleEnrolledUserIds,
    ...(enrolledStudents ? { enrolledStudents } : {}),
    isFree: Boolean(cls.isFree),
    price: cls.price || 0,
    format: cls.format || 'Interactive Workshop',
    meetingLink: isHostOrAdmin || isEnrolled ? (cls.meetingLink || '') : '',
    thumbnailUrl: cls.thumbnailUrl || '',
    instructions: isHostOrAdmin || isEnrolled ? (cls.instructions || '') : (cls.instructions || ''),
    status: cls.status,
    cancellationReason: cls.cancellationReason || undefined,
  };
};

export const getClasses = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();
    const scope = (req.query.scope as string) || 'my_sessions';
    const tab = (req.query.tab as string) || 'all';
    const pricing = (req.query.pricing as string) || 'all';
    const category = req.query.category as string | undefined;

    const filter: Record<string, any> = {};

    if (scope === 'my_enrollments') {
      filter.enrolledUserIds = userId;
    } else if (scope === 'my_sessions') {
      if (req.user.role === 'teacher') {
        filter.$or = [{ teacherId: userId }, { enrolledUserIds: userId }];
      } else {
        filter.enrolledUserIds = userId;
      }
    } else if (scope === 'teacher_hosted') {
      filter.teacherId = userId;
    }

    if (tab === 'upcoming') {
      filter.status = { $in: ['Scheduled', 'In Progress'] };
    } else if (tab === 'past') {
      filter.status = { $in: ['Completed', 'Cancelled'] };
    }

    if (pricing === 'free') {
      filter.isFree = true;
    } else if (pricing === 'paid') {
      filter.isFree = false;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    const classes = await ClassSession.find(filter)
      .populate('enrolledUserIds', 'name email avatarUrl avatarBgColor')
      .sort({ dateTime: 1 });

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes.map((c) => adaptClassForUser(c, userIdStr, req.user!.role)),
    });
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid workshop ID.' });
      return;
    }

    const cls = await ClassSession.findById(id).populate(
      'enrolledUserIds',
      'name email avatarUrl avatarBgColor'
    );
    if (!cls) {
      res.status(404).json({ success: false, message: 'Workshop not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: adaptClassForUser(cls, req.user._id.toString(), req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only authenticated teachers can host live classes or workshops.',
      });
      return;
    }

    const {
      title,
      skillName,
      category,
      description,
      dateTime,
      durationMinutes = 60,
      capacity = 15,
      isFree = true,
      price = 0,
      format = 'Interactive Workshop',
      meetingLink = '',
      thumbnailUrl = '',
      instructions = '',
    } = req.body;

    if (!title || !String(title).trim() || !skillName || !String(skillName).trim() || !category || !String(category).trim() || !description || !String(description).trim() || !dateTime) {
      res.status(400).json({
        success: false,
        message: 'Class title, skill/topic, main category, description, and scheduled date/time are required.',
      });
      return;
    }

    const scheduledDate = new Date(dateTime);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      res.status(400).json({
        success: false,
        message: 'Scheduled date and time must be a valid future date and time.',
      });
      return;
    }

    const numericDuration = Number(durationMinutes);
    if (Number.isNaN(numericDuration) || numericDuration < 15) {
      res.status(400).json({ success: false, message: 'Duration must be at least 15 minutes.' });
      return;
    }

    const numericCapacity = Number(capacity);
    if (Number.isNaN(numericCapacity) || numericCapacity < 1) {
      res.status(400).json({ success: false, message: 'Maximum participants must be at least 1.' });
      return;
    }

    const numericPrice = Number(price);
    if (!isFree && (Number.isNaN(numericPrice) || numericPrice <= 0)) {
      res.status(400).json({ success: false, message: 'Paid classes must have a valid price greater than $0.' });
      return;
    }

    const newCls = await ClassSession.create({
      teacherId: req.user._id,
      teacherName: req.user.name,
      title: String(title).trim(),
      skillName: String(skillName).trim(),
      category: String(category).trim(),
      description: String(description).trim(),
      dateTime: scheduledDate,
      durationMinutes: numericDuration,
      capacity: numericCapacity,
      enrolledUserIds: [],
      isFree: Boolean(isFree),
      price: isFree ? 0 : numericPrice,
      format,
      meetingLink: String(meetingLink || '').trim(),
      thumbnailUrl: String(thumbnailUrl || '').trim(),
      instructions: String(instructions || '').trim(),
      status: 'Scheduled',
    });

    const teacherAdapted = adaptClassForUser(newCls, req.user._id.toString(), req.user.role);

    // Notify eligible students persistently in MongoDB and in real time via Socket.IO
    const students = await User.find({
      role: 'learner',
      isSuspended: { $ne: true },
      _id: { $ne: req.user._id },
    }).select('_id');

    if (students.length > 0) {
      const dateStr = scheduledDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = scheduledDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const actionUrl = `/classes?classId=${newCls._id.toString()}`;
      const notifMessage = `${req.user.name} is hosting ${newCls.title} on ${dateStr} at ${timeStr}. Enroll now to reserve your seat.`;

      const notifDocs = students.map((s) => ({
        userId: s._id,
        title: 'New Live Class Available!',
        message: notifMessage,
        category: 'Sessions' as const,
        actionUrl,
        isRead: false,
      }));

      const insertedNotifs = await Notification.insertMany(notifDocs);
      const publicAdapted = adaptClassForUser(newCls, '', 'learner');

      insertedNotifs.forEach((n) => {
        const uid = n.userId.toString();
        emitToUser(uid, 'notification:received', n);
        emitToUser(uid, 'class:created', publicAdapted);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Live class created and published successfully.',
      data: teacherAdapted,
    });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid workshop ID.' });
      return;
    }

    const cls = await ClassSession.findById(id);
    if (!cls) {
      res.status(404).json({ success: false, message: 'Workshop not found.' });
      return;
    }

    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only the host teacher can update this workshop.' });
      return;
    }

    const prevDateTime = cls.dateTime ? new Date(cls.dateTime).getTime() : 0;

    if (req.body.dateTime !== undefined) {
      const nextDate = new Date(req.body.dateTime);
      if (Number.isNaN(nextDate.getTime()) || nextDate.getTime() <= Date.now()) {
        res.status(400).json({
          success: false,
          message: 'Rescheduled date and time must be a valid future date and time.',
        });
        return;
      }
      cls.dateTime = nextDate;
    }

    if (req.body.isFree !== undefined) {
      cls.isFree = Boolean(req.body.isFree);
      if (cls.isFree) cls.price = 0;
    }
    if (!cls.isFree && req.body.price !== undefined) {
      const p = Number(req.body.price);
      if (Number.isNaN(p) || p <= 0) {
        res.status(400).json({ success: false, message: 'Paid classes must have a price greater than $0.' });
        return;
      }
      cls.price = p;
    }

    const allowed = ['title', 'skillName', 'category', 'description', 'durationMinutes', 'capacity', 'format', 'meetingLink', 'thumbnailUrl', 'instructions'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (cls as any)[key] = req.body[key];
      }
    }
    await cls.save();
    await cls.populate('enrolledUserIds', 'name email avatarUrl avatarBgColor');

    const isRescheduled = cls.dateTime.getTime() !== prevDateTime;
    if (cls.enrolledUserIds.length > 0) {
      const dateStr = cls.dateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = cls.dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const notifDocs = cls.enrolledUserIds.map((u: any) => ({
        userId: u._id || u,
        title: isRescheduled ? 'Class Rescheduled' : 'Class Details Updated',
        message: isRescheduled
          ? `"${cls.title}" has been rescheduled to ${dateStr} at ${timeStr}.`
          : `The instructor updated details for "${cls.title}".`,
        category: 'Sessions' as const,
        actionUrl: `/classes?classId=${cls._id.toString()}`,
        isRead: false,
      }));
      const inserted = await Notification.insertMany(notifDocs);
      inserted.forEach((n) => {
        const uid = n.userId.toString();
        emitToUser(uid, 'notification:received', n);
        emitToUser(uid, 'class:updated', adaptClassForUser(cls, uid, 'learner'));
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workshop updated successfully.',
      data: adaptClassForUser(cls, req.user._id.toString(), req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

export const enrollInClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid workshop ID.' });
      return;
    }

    const cls = await ClassSession.findById(id);
    if (!cls) {
      res.status(404).json({ success: false, message: 'Workshop not found.' });
      return;
    }

    if (cls.status !== 'Scheduled') {
      res.status(400).json({ success: false, message: 'Cannot enroll in a workshop that is not scheduled.' });
      return;
    }

    if (cls.teacherId.toString() === req.user._id.toString()) {
      res.status(400).json({ success: false, message: 'You are the host of this workshop.' });
      return;
    }

    const alreadyEnrolled = cls.enrolledUserIds.some((uid) => uid.toString() === req.user!._id.toString());
    if (alreadyEnrolled) {
      res.status(409).json({
        success: false,
        message: 'You are already enrolled in this workshop.',
      });
      return;
    }

    if (cls.enrolledUserIds.length >= cls.capacity) {
      res.status(400).json({ success: false, message: 'This workshop is full.' });
      return;
    }

    // Paid classes cannot be marked enrolled without a real payment gateway confirmation
    if (!cls.isFree && cls.price > 0) {
      res.status(402).json({
        success: false,
        message:
          'Online payment integration is not yet available for paid classes. Enrollment is not permitted without verified payment.',
      });
      return;
    }

    cls.enrolledUserIds.push(req.user._id);
    await cls.save();

    // Notify host teacher
    const teacherNotif = await Notification.create({
      userId: cls.teacherId,
      title: 'New Student Enrollment',
      message: `${req.user.name} enrolled in "${cls.title}".`,
      category: 'Sessions',
      actionUrl: `/classes?classId=${cls._id.toString()}`,
    });
    emitToUser(cls.teacherId.toString(), 'notification:received', teacherNotif);
    emitToUser(cls.teacherId.toString(), 'class:updated', adaptClassForUser(cls, cls.teacherId.toString(), 'teacher'));

    res.status(200).json({
      success: true,
      message: `Enrolled in "${cls.title}" successfully.`,
      data: adaptClassForUser(cls, req.user._id.toString(), req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

export const cancelClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid workshop ID.' });
      return;
    }

    const cls = await ClassSession.findById(id);
    if (!cls) {
      res.status(404).json({ success: false, message: 'Workshop not found.' });
      return;
    }

    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only the host teacher can cancel this workshop.' });
      return;
    }

    const reason = String(req.body.reason || 'Cancelled by instructor').trim();
    cls.status = 'Cancelled';
    cls.cancellationReason = reason;
    await cls.save();

    if (cls.enrolledUserIds.length > 0) {
      const notifDocs = cls.enrolledUserIds.map((uid) => ({
        userId: uid,
        title: 'Live Class Cancelled',
        message: `"${cls.title}" was cancelled by ${cls.teacherName}. Reason: ${reason}`,
        category: 'Sessions' as const,
        actionUrl: `/classes?classId=${cls._id.toString()}`,
        isRead: false,
      }));
      const inserted = await Notification.insertMany(notifDocs);
      inserted.forEach((n) => {
        const uid = n.userId.toString();
        emitToUser(uid, 'notification:received', n);
        emitToUser(uid, 'class:updated', adaptClassForUser(cls, uid, 'learner'));
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workshop cancelled.',
      data: adaptClassForUser(cls, req.user._id.toString(), req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

export const completeClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid workshop ID.' });
      return;
    }

    const cls = await ClassSession.findById(id);
    if (!cls) {
      res.status(404).json({ success: false, message: 'Workshop not found.' });
      return;
    }

    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only the host teacher can complete this workshop.' });
      return;
    }

    cls.status = 'Completed';
    await cls.save();

    res.status(200).json({
      success: true,
      message: 'Workshop marked as completed.',
      data: adaptClassForUser(cls, req.user._id.toString(), req.user.role),
    });
  } catch (error) {
    next(error);
  }
};
