import { Request, Response, NextFunction } from 'express';
import { Skill } from '../models/Skill.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const getSkills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, skillType, search, freeOnly } = req.query;
    const filter: Record<string, unknown> = {};

    if (category && typeof category === 'string' && category !== 'All') {
      filter.category = category;
    }

    if (skillType && (skillType === 'Teaching' || skillType === 'Learning')) {
      filter.skillType = skillType;
    }

    if (freeOnly === 'true') {
      filter.freeSwapAvailable = true;
    }

    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skills = await Skill.find(filter)
      .populate('userId', 'name role avatarUrl avatarBgColor rating location')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: skills.length,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
};

export const getSkillById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const skill = await Skill.findById(id).populate('userId', 'name role avatarUrl avatarBgColor rating location');

    if (!skill) {
      res.status(404).json({ success: false, message: 'Skill not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: skill,
    });
  } catch (error) {
    next(error);
  }
};

export const createSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const {
      name,
      skillName,
      category,
      description,
      proficiency,
      experienceLevel,
      skillType = 'Teaching',
      yearsExperience = 1,
      freeSwapAvailable = true,
      paidLessonAvailable = false,
      hourlyPrice = 0,
      availabilitySchedule = 'Flexible schedule',
    } = req.body;

    const finalName = name || skillName;
    if (!finalName || !category || !description) {
      res.status(400).json({
        success: false,
        message: 'Skill name, category, and description are required.',
      });
      return;
    }

    const newSkill = await Skill.create({
      userId: req.user._id,
      name: finalName,
      category,
      description,
      proficiency: proficiency || experienceLevel || 'Intermediate',
      skillType,
      yearsExperience,
      freeSwapAvailable,
      paidLessonAvailable,
      hourlyPrice,
      availabilitySchedule,
    });

    res.status(201).json({
      success: true,
      message: 'Skill created successfully.',
      data: newSkill,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const skill = await Skill.findById(id);

    if (!skill) {
      res.status(404).json({ success: false, message: 'Skill not found.' });
      return;
    }

    // Authorization check: must be owner or admin
    if (skill.userId.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized to update this skill.' });
      return;
    }

    const updatedSkill = await Skill.findByIdAndUpdate(id, { $set: req.body }, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      message: 'Skill updated successfully.',
      data: updatedSkill,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const skill = await Skill.findById(id);

    if (!skill) {
      res.status(404).json({ success: false, message: 'Skill not found.' });
      return;
    }

    if (skill.userId.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized to delete this skill.' });
      return;
    }

    await Skill.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Skill removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getSkillsByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const skills = await Skill.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: skills.length,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
};
