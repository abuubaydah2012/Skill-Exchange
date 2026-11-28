import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Skill } from '../models/Skill.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const VALID_PROFICIENCIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

const adaptSkill = (s: any) => ({
  id: s._id.toString(),
  userId: s.userId?._id ? s.userId._id.toString() : s.userId?.toString(),
  name: s.name,
  category: s.category,
  subcategory: s.subcategory || '',
  categoryId: s.categoryId ? s.categoryId.toString() : undefined,
  subcategoryId: s.subcategoryId ? s.subcategoryId.toString() : undefined,
  description: s.description,
  proficiency: s.proficiency,
  skillType: s.skillType || 'Teaching',
  yearsExperience: s.yearsExperience ?? 0,
  freeSwapAvailable: Boolean(s.freeSwapAvailable),
  paidLessonAvailable: Boolean(s.paidLessonAvailable),
  hourlyPrice: s.hourlyPrice ?? 0,
  availabilitySchedule: s.availabilitySchedule || 'Flexible schedule',
  verificationStatus: s.verificationStatus || 'Pending',
});

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
      subcategory = '',
      categoryId,
      subcategoryId,
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

    const finalName = (name || skillName || '').trim();
    if (!finalName || !category || !String(category).trim() || !description || !String(description).trim()) {
      res.status(400).json({
        success: false,
        message: 'Skill name, category, and description are required.',
      });
      return;
    }

    const finalProficiency = proficiency || experienceLevel || 'Intermediate';
    if (!VALID_PROFICIENCIES.includes(finalProficiency)) {
      res.status(400).json({
        success: false,
        message: `Proficiency must be one of: ${VALID_PROFICIENCIES.join(', ')}.`,
      });
      return;
    }

    const numericYears = Number(yearsExperience);
    if (Number.isNaN(numericYears) || numericYears < 0) {
      res.status(400).json({
        success: false,
        message: 'Years of experience must be a valid non-negative number.',
      });
      return;
    }

    const numericPrice = Number(hourlyPrice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      res.status(400).json({
        success: false,
        message: 'Hourly price must be a valid non-negative number.',
      });
      return;
    }

    const newSkill = await Skill.create({
      userId: req.user._id,
      name: finalName,
      category: String(category).trim(),
      subcategory: String(subcategory || '').trim(),
      ...(categoryId && mongoose.Types.ObjectId.isValid(categoryId) ? { categoryId } : {}),
      ...(subcategoryId && mongoose.Types.ObjectId.isValid(subcategoryId) ? { subcategoryId } : {}),
      description: String(description).trim(),
      proficiency: finalProficiency,
      skillType,
      yearsExperience: numericYears,
      freeSwapAvailable: Boolean(freeSwapAvailable),
      paidLessonAvailable: Boolean(paidLessonAvailable),
      hourlyPrice: paidLessonAvailable ? numericPrice : 0,
      availabilitySchedule: String(availabilitySchedule || 'Flexible schedule').trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Skill created successfully.',
      data: adaptSkill(newSkill),
    });
  } catch (error) {
    next(error);
  }
};

export const updateSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid skill ID format.' });
      return;
    }

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

    const updates: Record<string, any> = {};
    const allowedFields = [
      'name',
      'category',
      'subcategory',
      'categoryId',
      'subcategoryId',
      'description',
      'proficiency',
      'yearsExperience',
      'freeSwapAvailable',
      'paidLessonAvailable',
      'hourlyPrice',
      'availabilitySchedule',
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.proficiency !== undefined && !VALID_PROFICIENCIES.includes(updates.proficiency)) {
      res.status(400).json({
        success: false,
        message: `Proficiency must be one of: ${VALID_PROFICIENCIES.join(', ')}.`,
      });
      return;
    }

    if (updates.yearsExperience !== undefined) {
      const yrs = Number(updates.yearsExperience);
      if (Number.isNaN(yrs) || yrs < 0) {
        res.status(400).json({ success: false, message: 'Years of experience must be a valid non-negative number.' });
        return;
      }
      updates.yearsExperience = yrs;
    }

    if (updates.hourlyPrice !== undefined) {
      const price = Number(updates.hourlyPrice);
      if (Number.isNaN(price) || price < 0) {
        res.status(400).json({ success: false, message: 'Hourly price must be a valid non-negative number.' });
        return;
      }
      updates.hourlyPrice = price;
    }

    if (updates.categoryId && !mongoose.Types.ObjectId.isValid(updates.categoryId)) {
      delete updates.categoryId;
    }
    if (updates.subcategoryId && !mongoose.Types.ObjectId.isValid(updates.subcategoryId)) {
      delete updates.subcategoryId;
    }

    const updatedSkill = await Skill.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      message: 'Skill updated successfully.',
      data: updatedSkill ? adaptSkill(updatedSkill) : null,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid skill ID format.' });
      return;
    }

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
