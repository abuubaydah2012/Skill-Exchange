import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Subcategory } from '../models/Subcategory.js';
import { CategorySuggestion } from '../models/CategorySuggestion.js';
import { Skill } from '../models/Skill.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { toSlug } from '../utils/categorySeed.js';

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const catFilter = includeInactive ? {} : { isActive: true };
    const subFilter = includeInactive ? {} : { isActive: true };

    const [categories, subcategories] = await Promise.all([
      Category.find(catFilter).sort({ displayOrder: 1, name: 1 }),
      Subcategory.find(subFilter).sort({ name: 1 }),
    ]);

    const adapted = categories.map((c) => {
      const subs = subcategories
        .filter((s) => s.categoryId.toString() === c._id.toString())
        .map((s) => ({
          id: s._id.toString(),
          categoryId: s.categoryId.toString(),
          name: s.name,
          slug: s.slug,
          description: s.description || '',
          isActive: s.isActive,
        }));

      return {
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        icon: c.icon || 'Folder',
        isActive: c.isActive,
        displayOrder: c.displayOrder,
        subcategories: subs,
      };
    });

    res.status(200).json({
      success: true,
      count: adapted.length,
      data: adapted,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description = '', icon = 'Folder', displayOrder = 99 } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Category name is required.' });
      return;
    }

    const cleanName = name.trim();
    const slug = toSlug(cleanName);
    const existing = await Category.findOne({ slug });
    if (existing) {
      res.status(409).json({ success: false, message: `Category "${existing.name}" already exists.` });
      return;
    }

    const cat = await Category.create({
      name: cleanName,
      slug,
      description: String(description || '').trim(),
      icon: String(icon || 'Folder').trim(),
      isActive: true,
      displayOrder: Number(displayOrder) || 99,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: {
        id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        isActive: cat.isActive,
        displayOrder: cat.displayOrder,
        subcategories: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid category ID.' });
      return;
    }

    const cat = await Category.findById(id);
    if (!cat) {
      res.status(404).json({ success: false, message: 'Category not found.' });
      return;
    }

    const { name, description, icon, isActive, displayOrder } = req.body;
    const previousName = cat.name;

    if (typeof name === 'string' && name.trim()) {
      const cleanName = name.trim();
      const newSlug = toSlug(cleanName);
      const duplicate = await Category.findOne({ slug: newSlug, _id: { $ne: cat._id } });
      if (duplicate) {
        res.status(409).json({ success: false, message: `Category "${duplicate.name}" already exists.` });
        return;
      }
      cat.name = cleanName;
      cat.slug = newSlug;
    }

    if (typeof description === 'string') cat.description = description.trim();
    if (typeof icon === 'string' && icon.trim()) cat.icon = icon.trim();
    if (typeof isActive === 'boolean') cat.isActive = isActive;
    if (typeof displayOrder === 'number') cat.displayOrder = displayOrder;

    await cat.save();

    // Keep linked skills' category string synchronized if renamed
    if (cat.name !== previousName) {
      await Skill.updateMany(
        { $or: [{ categoryId: cat._id }, { category: previousName }] },
        { $set: { category: cat.name, categoryId: cat._id } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: {
        id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        isActive: cat.isActive,
        displayOrder: cat.displayOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const migrateTo = req.query.migrateTo as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid category ID.' });
      return;
    }

    const cat = await Category.findById(id);
    if (!cat) {
      res.status(404).json({ success: false, message: 'Category not found.' });
      return;
    }

    const linkedSkillCount = await Skill.countDocuments({
      $or: [{ categoryId: cat._id }, { category: cat.name }],
    });

    if (linkedSkillCount > 0) {
      if (migrateTo && mongoose.Types.ObjectId.isValid(migrateTo) && migrateTo !== id) {
        const targetCat = await Category.findById(migrateTo);
        if (!targetCat) {
          res.status(404).json({ success: false, message: 'Target migration category not found.' });
          return;
        }
        await Skill.updateMany(
          { $or: [{ categoryId: cat._id }, { category: cat.name }] },
          { $set: { category: targetCat.name, categoryId: targetCat._id } }
        );
        await Subcategory.deleteMany({ categoryId: cat._id });
        await Category.deleteOne({ _id: cat._id });
        res.status(200).json({
          success: true,
          message: `Migrated ${linkedSkillCount} skills to "${targetCat.name}" and deleted "${cat.name}".`,
        });
        return;
      }

      // Safe deactivation: preserve all associated teacher profiles and historical appointments
      cat.isActive = false;
      await cat.save();
      res.status(200).json({
        success: true,
        deactivatedOnly: true,
        message: `"${cat.name}" has ${linkedSkillCount} linked skill(s), so it was safely deactivated instead of deleted.`,
      });
      return;
    }

    await Subcategory.deleteMany({ categoryId: cat._id });
    await Category.deleteOne({ _id: cat._id });

    res.status(200).json({
      success: true,
      message: `Category "${cat.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

export const createSubcategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid parent category ID.' });
      return;
    }

    const parentCat = await Category.findById(id);
    if (!parentCat) {
      res.status(404).json({ success: false, message: 'Parent category not found.' });
      return;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Subcategory name is required.' });
      return;
    }

    const cleanName = name.trim();
    const slug = toSlug(cleanName);
    const duplicate = await Subcategory.findOne({ categoryId: parentCat._id, slug });
    if (duplicate) {
      res.status(409).json({
        success: false,
        message: `Subcategory "${duplicate.name}" already exists under "${parentCat.name}".`,
      });
      return;
    }

    const sub = await Subcategory.create({
      categoryId: parentCat._id,
      name: cleanName,
      slug,
      description: String(description || '').trim(),
      isActive: true,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully.',
      data: {
        id: sub._id.toString(),
        categoryId: sub.categoryId.toString(),
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        isActive: sub.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubcategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subId)) {
      res.status(400).json({ success: false, message: 'Invalid subcategory ID.' });
      return;
    }

    const sub = await Subcategory.findById(subId);
    if (!sub) {
      res.status(404).json({ success: false, message: 'Subcategory not found.' });
      return;
    }

    const { name, description, isActive } = req.body;
    const prevName = sub.name;

    if (typeof name === 'string' && name.trim()) {
      const cleanName = name.trim();
      const newSlug = toSlug(cleanName);
      const duplicate = await Subcategory.findOne({
        categoryId: sub.categoryId,
        slug: newSlug,
        _id: { $ne: sub._id },
      });
      if (duplicate) {
        res.status(409).json({ success: false, message: `Subcategory "${duplicate.name}" already exists.` });
        return;
      }
      sub.name = cleanName;
      sub.slug = newSlug;
    }

    if (typeof description === 'string') sub.description = description.trim();
    if (typeof isActive === 'boolean') sub.isActive = isActive;

    await sub.save();

    if (sub.name !== prevName) {
      await Skill.updateMany(
        { subcategoryId: sub._id },
        { $set: { subcategory: sub.name } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Subcategory updated successfully.',
      data: {
        id: sub._id.toString(),
        categoryId: sub.categoryId.toString(),
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        isActive: sub.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubcategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subId)) {
      res.status(400).json({ success: false, message: 'Invalid subcategory ID.' });
      return;
    }

    const sub = await Subcategory.findById(subId);
    if (!sub) {
      res.status(404).json({ success: false, message: 'Subcategory not found.' });
      return;
    }

    const linkedCount = await Skill.countDocuments({
      $or: [{ subcategoryId: sub._id }, { subcategory: sub.name }],
    });

    if (linkedCount > 0) {
      sub.isActive = false;
      await sub.save();
      res.status(200).json({
        success: true,
        deactivatedOnly: true,
        message: `"${sub.name}" has ${linkedCount} linked skill(s), so it was safely deactivated.`,
      });
      return;
    }

    await Subcategory.deleteOne({ _id: sub._id });
    res.status(200).json({
      success: true,
      message: `Subcategory "${sub.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategorySuggestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const filter = req.user.role === 'admin' ? {} : { suggestedBy: req.user._id };
    const suggestions = await CategorySuggestion.find(filter).sort({ createdAt: -1 });

    const adapted = suggestions.map((s) => ({
      id: s._id.toString(),
      type: s.type,
      name: s.name,
      parentCategoryId: s.parentCategoryId ? s.parentCategoryId.toString() : undefined,
      parentCategoryName: s.parentCategoryName || undefined,
      description: s.description || '',
      reason: s.reason || '',
      suggestedBy: s.suggestedBy.toString(),
      suggestedByName: s.suggestedByName || 'Member',
      status: s.status,
      rejectionReason: s.rejectionReason || '',
      createdAt: s.createdAt.toISOString(),
    }));

    res.status(200).json({
      success: true,
      count: adapted.length,
      data: adapted,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategorySuggestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { type = 'category', name, parentCategoryId, description = '', reason = '' } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Suggested name is required.' });
      return;
    }

    const cleanName = name.trim();
    const slug = toSlug(cleanName);

    let parentCat: any = null;
    if (type === 'subcategory') {
      if (!parentCategoryId || !mongoose.Types.ObjectId.isValid(parentCategoryId)) {
        res.status(400).json({ success: false, message: 'Valid parent category is required for a subcategory suggestion.' });
        return;
      }
      parentCat = await Category.findById(parentCategoryId);
      if (!parentCat) {
        res.status(404).json({ success: false, message: 'Parent category not found.' });
        return;
      }
      const existingSub = await Subcategory.findOne({ categoryId: parentCat._id, slug });
      if (existingSub) {
        res.status(409).json({
          success: false,
          message: `Subcategory "${existingSub.name}" already exists under "${parentCat.name}".`,
        });
        return;
      }
    } else {
      const existingCat = await Category.findOne({ slug });
      if (existingCat) {
        res.status(409).json({
          success: false,
          message: `Category "${existingCat.name}" already exists.`,
        });
        return;
      }
    }

    const duplicatePending = await CategorySuggestion.findOne({
      type,
      name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      status: 'Pending',
      ...(parentCat ? { parentCategoryId: parentCat._id } : {}),
    });

    if (duplicatePending) {
      res.status(409).json({
        success: false,
        message: 'A pending suggestion with this name already exists.',
      });
      return;
    }

    const suggestion = await CategorySuggestion.create({
      type,
      name: cleanName,
      parentCategoryId: parentCat ? parentCat._id : undefined,
      parentCategoryName: parentCat ? parentCat.name : undefined,
      description: String(description || '').trim(),
      reason: String(reason || '').trim(),
      suggestedBy: req.user._id,
      suggestedByName: req.user.name,
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      message: 'Category suggestion submitted for Admin review.',
      data: {
        id: suggestion._id.toString(),
        type: suggestion.type,
        name: suggestion.name,
        parentCategoryId: suggestion.parentCategoryId?.toString(),
        parentCategoryName: suggestion.parentCategoryName,
        description: suggestion.description,
        reason: suggestion.reason,
        suggestedBy: suggestion.suggestedBy.toString(),
        suggestedByName: suggestion.suggestedByName,
        status: suggestion.status,
        createdAt: suggestion.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewCategorySuggestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    const { decision, rejectionReason = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid suggestion ID.' });
      return;
    }

    if (decision !== 'Approved' && decision !== 'Rejected') {
      res.status(400).json({ success: false, message: 'Decision must be Approved or Rejected.' });
      return;
    }

    const suggestion = await CategorySuggestion.findById(id);
    if (!suggestion) {
      res.status(404).json({ success: false, message: 'Suggestion not found.' });
      return;
    }

    if (suggestion.status !== 'Pending') {
      res.status(400).json({ success: false, message: `Suggestion has already been ${suggestion.status.toLowerCase()}.` });
      return;
    }

    if (decision === 'Approved') {
      const slug = toSlug(suggestion.name);
      if (suggestion.type === 'subcategory' && suggestion.parentCategoryId) {
        const existingSub = await Subcategory.findOne({
          categoryId: suggestion.parentCategoryId,
          slug,
        });
        if (!existingSub) {
          await Subcategory.create({
            categoryId: suggestion.parentCategoryId,
            name: suggestion.name,
            slug,
            description: suggestion.description || '',
            isActive: true,
            createdBy: suggestion.suggestedBy,
          });
        } else if (!existingSub.isActive) {
          existingSub.isActive = true;
          await existingSub.save();
        }
      } else {
        const existingCat = await Category.findOne({ slug });
        if (!existingCat) {
          await Category.create({
            name: suggestion.name,
            slug,
            description: suggestion.description || '',
            icon: 'Sparkles',
            isActive: true,
            displayOrder: 99,
            createdBy: suggestion.suggestedBy,
          });
        } else if (!existingCat.isActive) {
          existingCat.isActive = true;
          await existingCat.save();
        }
      }
    }

    suggestion.status = decision;
    suggestion.reviewedBy = req.user._id;
    suggestion.reviewedAt = new Date();
    suggestion.rejectionReason = decision === 'Rejected' ? String(rejectionReason || '').trim() : '';
    await suggestion.save();

    res.status(200).json({
      success: true,
      message: `Suggestion ${decision.toLowerCase()} successfully.`,
      data: {
        id: suggestion._id.toString(),
        status: suggestion.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
