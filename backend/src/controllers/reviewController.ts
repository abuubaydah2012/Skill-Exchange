import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Review, recomputeUserRating } from '../models/Review.js';
import { Appointment } from '../models/Appointment.js';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const adaptReview = (r: any) => {
  const reviewerObj = typeof r.reviewerId === 'object' && r.reviewerId !== null ? r.reviewerId : null;
  const reviewedObj = typeof r.reviewedUserId === 'object' && r.reviewedUserId !== null ? r.reviewedUserId : null;

  return {
    id: r._id.toString(),
    appointmentId: r.appointmentId ? r.appointmentId.toString() : undefined,
    sessionId: r.sessionId || (r.appointmentId ? r.appointmentId.toString() : ''),
    sessionTitle: r.sessionTitle || `1-on-1: ${r.skillName || 'Session'}`,
    reviewerId: reviewerObj?._id ? reviewerObj._id.toString() : r.reviewerId?.toString() || '',
    reviewerName: reviewerObj?.name || 'Student',
    reviewerRole: reviewerObj?.role || 'learner',
    reviewedUserId: reviewedObj?._id ? reviewedObj._id.toString() : r.reviewedUserId?.toString() || '',
    reviewedUserName: reviewedObj?.name || 'Instructor',
    skillName: r.skillName || 'Skill Session',
    title: r.title || '',
    rating: r.rating,
    comment: r.comment,
    isFlagged: Boolean(r.isFlagged),
    flagReason: r.flagReason || '',
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
  };
};

export const createReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const {
      appointmentId,
      sessionId,
      sessionTitle,
      skillName,
      title = '',
      rating,
      comment,
      reviewComment,
    } = req.body;

    const finalComment = (comment || reviewComment || '').trim();
    const numericRating = Number(rating);

    if (!numericRating || Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5.',
      });
      return;
    }

    if (!finalComment) {
      res.status(400).json({
        success: false,
        message: 'Written feedback comment is required.',
      });
      return;
    }

    const targetAppointmentId = appointmentId || sessionId;
    if (!targetAppointmentId || !mongoose.Types.ObjectId.isValid(targetAppointmentId)) {
      res.status(400).json({
        success: false,
        message: 'A valid completed appointment ID is required to submit a review.',
      });
      return;
    }

    const appointment = await Appointment.findById(targetAppointmentId);
    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
      return;
    }

    // Verify ownership: only the student (learnerId) who booked the appointment can review the teacher
    if (appointment.learnerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Only the student who completed this appointment can submit a review.',
      });
      return;
    }

    // Prevent reviewing self
    if (appointment.teacherId.toString() === req.user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot submit a review for your own profile.',
      });
      return;
    }

    // Enforce Completed status rule
    if (appointment.status !== 'Completed') {
      res.status(403).json({
        success: false,
        message: `Reviews can only be submitted for completed appointments (current status: ${appointment.status}).`,
      });
      return;
    }

    // Prevent duplicate review for the same appointment
    const existing = await Review.findOne({
      appointmentId: appointment._id,
      reviewerId: req.user._id,
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this appointment.',
      });
      return;
    }

    const review = await Review.create({
      reviewerId: req.user._id,
      reviewedUserId: appointment.teacherId,
      appointmentId: appointment._id,
      sessionId: appointment._id.toString(),
      sessionTitle: sessionTitle || `1-on-1: ${appointment.skillName}`,
      skillName: skillName || appointment.skillName,
      title: String(title || '').trim(),
      rating: Math.round(numericRating),
      comment: finalComment,
    });

    const summary = await recomputeUserRating(appointment.teacherId);

    await Notification.create({
      userId: appointment.teacherId,
      title: 'New Verified Review Received',
      message: `${req.user.name} left a ${Math.round(numericRating)}-star review for "${appointment.skillName}".`,
      category: 'Sessions',
      actionUrl: '/reviews',
    });

    await review.populate([
      { path: 'reviewerId', select: 'name avatarUrl avatarBgColor role' },
      { path: 'reviewedUserId', select: 'name avatarUrl avatarBgColor role' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: {
        review: adaptReview(review),
        teacherSummary: summary,
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this appointment.',
      });
      return;
    }
    next(error);
  }
};

export const getReviewsByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID.' });
      return;
    }

    const reviews = await Review.find({ reviewedUserId: userId, isFlagged: false })
      .populate('reviewerId', 'name avatarUrl avatarBgColor role')
      .populate('reviewedUserId', 'name avatarUrl avatarBgColor role')
      .sort({ createdAt: -1 });

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[star] += 1;
      sum += r.rating;
    });

    const count = reviews.length;
    const averageRating = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;

    res.status(200).json({
      success: true,
      count,
      summary: {
        averageRating,
        reviewCount: count,
        distribution,
      },
      data: reviews.map(adaptReview),
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const filter =
      req.user.role === 'admin'
        ? {}
        : { $or: [{ reviewerId: req.user._id }, { reviewedUserId: req.user._id }] };

    const reviews = await Review.find(filter)
      .populate('reviewerId', 'name avatarUrl avatarBgColor role')
      .populate('reviewedUserId', 'name avatarUrl avatarBgColor role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews.map(adaptReview),
    });
  } catch (error) {
    next(error);
  }
};

export const flagReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    const { reason = 'Reported for moderation review' } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid review ID.' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found.' });
      return;
    }

    review.isFlagged = true;
    review.flagReason = String(reason || '').trim();
    await review.save();
    await recomputeUserRating(review.reviewedUserId);

    res.status(200).json({
      success: true,
      message: 'Review flagged for moderation.',
    });
  } catch (error) {
    next(error);
  }
};

export const moderateReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid review ID.' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found.' });
      return;
    }

    if (action === 'delete') {
      await Review.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'Review permanently removed.' });
      return;
    }

    review.isFlagged = false;
    review.flagReason = '';
    await review.save();
    await recomputeUserRating(review.reviewedUserId);

    res.status(200).json({ success: true, message: 'Review restored and approved.' });
  } catch (error) {
    next(error);
  }
};
