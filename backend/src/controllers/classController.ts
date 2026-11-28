import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ClassSession } from '../models/ClassSession.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const adaptClassForUser = (cls: any, viewerId: string, viewerRole: string) => {
  const teacherIdStr = cls.teacherId?._id ? cls.teacherId._id.toString() : cls.teacherId.toString();
  const isHostOrAdmin = teacherIdStr === viewerId || viewerRole === 'admin';
  const enrolledStrs: string[] = (cls.enrolledUserIds || []).map((id: any) =>
    id?._id ? id._id.toString() : id.toString()
  );
  const isEnrolled = enrolledStrs.includes(viewerId);

  // Privacy: never expose other students' IDs to another student
  const visibleEnrolledUserIds = isHostOrAdmin
    ? enrolledStrs
    : isEnrolled
    ? [viewerId]
    : [];

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
    isFree: Boolean(cls.isFree),
    price: cls.price || 0,
    format: cls.format || 'Interactive Workshop',
    meetingLink: isHostOrAdmin || isEnrolled ? cls.meetingLink : '',
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
    // scope === 'public' returns all workshops (with private enrolledUserIds stripped for non-hosts)

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

    const classes = await ClassSession.find(filter).sort({ dateTime: 1 });

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes.map((c) => adaptClassForUser(c, userIdStr, req.user!.role)),
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
    } = req.body;

    if (!title || !skillName || !category || !description || !dateTime) {
      res.status(400).json({ success: false, message: 'Title, skill, category, description, and dateTime are required.' });
      return;
    }

    const newCls = await ClassSession.create({
      teacherId: req.user._id,
      teacherName: req.user.name,
      title: String(title).trim(),
      skillName: String(skillName).trim(),
      category: String(category).trim(),
      description: String(description).trim(),
      dateTime: new Date(dateTime),
      durationMinutes: Number(durationMinutes) || 60,
      capacity: Number(capacity) || 15,
      enrolledUserIds: [],
      isFree: Boolean(isFree),
      price: isFree ? 0 : Number(price) || 0,
      format,
      meetingLink: `https://meet.skillexchange.io/room/${Math.random().toString(36).substring(2, 10)}`,
      status: 'Scheduled',
    });

    res.status(201).json({
      success: true,
      message: 'Workshop created successfully.',
      data: adaptClassForUser(newCls, req.user._id.toString(), req.user.role),
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

    const allowed = ['title', 'skillName', 'category', 'description', 'dateTime', 'durationMinutes', 'capacity', 'isFree', 'price', 'format'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (cls as any)[key] = req.body[key];
      }
    }
    await cls.save();

    res.status(200).json({
      success: true,
      message: 'Workshop updated.',
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
      res.status(200).json({
        success: true,
        message: 'Already enrolled in this workshop.',
        data: adaptClassForUser(cls, req.user._id.toString(), req.user.role),
      });
      return;
    }

    if (cls.enrolledUserIds.length >= cls.capacity) {
      res.status(400).json({ success: false, message: 'This workshop is full.' });
      return;
    }

    cls.enrolledUserIds.push(req.user._id);
    await cls.save();

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

    cls.status = 'Cancelled';
    cls.cancellationReason = String(req.body.reason || 'Cancelled by instructor').trim();
    await cls.save();

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
