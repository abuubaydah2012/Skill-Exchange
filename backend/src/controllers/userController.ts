import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Skill } from '../models/Skill.js';
import { Certificate } from '../models/Certificate.js';
import { Review } from '../models/Review.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, search, location } = req.query;
    const filter: Record<string, unknown> = { isSuspended: { $ne: true } };

    if (role && (role === 'learner' || role === 'teacher' || role === 'admin')) {
      filter.role = role;
    }

    if (location && typeof location === 'string') {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();
      const matchingSkills = await Skill.find({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { title: { $regex: term, $options: 'i' } },
          { category: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
        ],
      }).select('userId');
      const userIdsFromSkills = matchingSkills.map((s) => s.userId);

      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { headline: { $regex: term, $options: 'i' } },
        { bio: { $regex: term, $options: 'i' } },
        { learningInterests: { $regex: term, $options: 'i' } },
        { _id: { $in: userIdsFromSkills } },
      ];
    }

    const users = await User.find(filter).sort({ rating: -1, createdAt: -1 });
    const userIds = users.map((u) => u._id);
    const skills = await Skill.find({ userId: { $in: userIds } });

    const adaptedUsers = users.map((u) => {
      const uObj: any = u.toJSON();
      uObj.id = u._id.toString();
      uObj.teachingSkills = skills
        .filter((s) => s.userId.toString() === u._id.toString())
        .map((s) => ({
          id: s._id.toString(),
          name: s.name,
          category: s.category,
          subcategory: s.subcategory || '',
          categoryId: s.categoryId ? s.categoryId.toString() : undefined,
          subcategoryId: s.subcategoryId ? s.subcategoryId.toString() : undefined,
          description: s.description,
          proficiency: s.proficiency,
          yearsExperience: s.yearsExperience || 1,
          freeSwapAvailable: Boolean(s.freeSwapAvailable),
          paidLessonAvailable: Boolean(s.paidLessonAvailable),
          hourlyPrice: s.hourlyPrice || 0,
          availabilitySchedule: s.availabilitySchedule || 'Flexible schedule',
          verificationStatus: s.verificationStatus || 'Verified',
        }));
      return uObj;
    });

    res.status(200).json({
      success: true,
      count: adaptedUsers.length,
      data: adaptedUsers,
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

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const [skills, certificates, reviews] = await Promise.all([
      Skill.find({ userId: req.user._id }).sort({ createdAt: -1 }),
      Certificate.find({ userId: req.user._id }),
      Review.find({ reviewedUserId: req.user._id, isFlagged: false }).populate('reviewerId', 'name avatarUrl'),
    ]);

    const userObj = req.user.toJSON();
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
      'profileVisibility',
      'countryCode',
      'dateOfBirth',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Check phone number duplication if provided
    if (req.body.phoneNumber !== undefined) {
      if (typeof req.body.phoneNumber === 'string' && req.body.phoneNumber.trim().length > 0) {
        const cleanPhone = req.body.phoneNumber.trim();
        const existing = await User.findOne({ phoneNumber: cleanPhone, _id: { $ne: req.user._id } });
        if (existing) {
          res.status(409).json({ success: false, message: 'An account with this phone number already exists.' });
          return;
        }
        updates.phoneNumber = cleanPhone;
      } else {
        updates.phoneNumber = '';
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
