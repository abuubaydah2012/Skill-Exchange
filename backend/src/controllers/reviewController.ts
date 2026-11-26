import { Request, Response, NextFunction } from 'express';
import { Review } from '../models/Review.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const createReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const {
      reviewedUserId,
      appointmentId,
      sessionId,
      sessionTitle,
      skillName,
      rating,
      comment,
      reviewComment,
    } = req.body;

    const finalComment = comment || reviewComment;

    if (!reviewedUserId || !rating || !finalComment) {
      res.status(400).json({
        success: false,
        message: 'Reviewed user ID, rating (1-5), and review comment are required.',
      });
      return;
    }

    if (reviewedUserId === req.user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot submit a review for yourself.',
      });
      return;
    }

    const review = await Review.create({
      reviewerId: req.user._id,
      reviewedUserId,
      appointmentId,
      sessionId,
      sessionTitle,
      skillName,
      rating: Number(rating),
      comment: finalComment,
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ reviewedUserId: userId, isFlagged: false })
      .populate('reviewerId', 'name avatarUrl avatarBgColor role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
