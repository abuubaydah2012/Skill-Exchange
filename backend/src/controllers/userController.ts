import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Skill } from '../models/Skill.js';
import { Certificate } from '../models/Certificate.js';
import { Review } from '../models/Review.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, search, location } = req.query;
    const filter: Record<string, unknown> = { isSuspended: false };

    if (role && (role === 'learner' || role === 'teacher' || role === 'admin')) {
      filter.role = role;
    }

    if (location && typeof location === 'string') {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { learningInterests: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ rating: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    // Attach related skills and certificates
    const [skills, certificates, reviews] = await Promise.all([
      Skill.find({ userId: user._id }),
      Certificate.find({ userId: user._id, status: 'Verified' }),
      Review.find({ reviewedUserId: user._id, isFlagged: false }).populate('reviewerId', 'name avatarUrl'),
    ]);

    const userObj = user.toJSON();
    (userObj as any).teachingSkills = skills;
    (userObj as any).certificates = certificates;
    (userObj as any).reviews = reviews;

    res.status(200).json({
      success: true,
      data: userObj,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const allowedUpdates = [
      'name',
      'headline',
      'bio',
      'location',
      'languages',
      'learningInterests',
      'avatarUrl',
      'phoneNumber',
      'profileVisibility',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    await User.findByIdAndDelete(id);

    // Clean up related user records
    await Promise.all([
      Skill.deleteMany({ userId: id }),
      Certificate.deleteMany({ userId: id }),
    ]);

    res.status(200).json({
      success: true,
      message: 'User account and associated records deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
