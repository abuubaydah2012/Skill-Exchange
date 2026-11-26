import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      role = 'learner',
      phoneNumber,
      countryCode = '+1',
      dateOfBirth,
      identityDocument,
      avatarUrl,
      bio,
      headline,
      location,
      languages,
      learningInterests,
    } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters long.',
      });
      return;
    }

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters long.',
      });
      return;
    }

    // Security check: Public registration must NEVER allow creating an admin account
    if (role === 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be created through public registration.',
      });
      return;
    }

    const allowedPublicRoles = ['learner', 'teacher'];
    if (role && !allowedPublicRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role specified. Public registration only allows "learner" or "teacher".',
      });
      return;
    }

    const finalRole: 'learner' | 'teacher' = role === 'teacher' ? 'teacher' : 'learner';

    // 2. Check for duplicate email
    const existingUserByEmail = await User.findOne({ email: cleanEmail });
    if (existingUserByEmail) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
      return;
    }

    // 3. Check for duplicate phone number if provided
    let cleanPhone: string | undefined;
    if (phoneNumber && typeof phoneNumber === 'string' && phoneNumber.trim().length > 0) {
      cleanPhone = phoneNumber.trim();
      const existingUserByPhone = await User.findOne({ phoneNumber: cleanPhone });
      if (existingUserByPhone) {
        res.status(409).json({
          success: false,
          message: 'An account with this phone number already exists.',
        });
        return;
      }
    }

    // Compute age if dateOfBirth provided
    let age: number | undefined;
    if (dateOfBirth) {
      const birth = new Date(dateOfBirth);
      if (!isNaN(birth.getTime())) {
        const diff = Date.now() - birth.getTime();
        age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
      }
    }

    // Prepare identity verification object if provided
    let identityVerificationData: any = undefined;
    let accountVerificationStatus = 'Unverified';
    if (identityDocument && identityDocument.documentNumber) {
      identityVerificationData = {
        status: 'Pending',
        documentType: identityDocument.type || 'National ID (NID)',
        documentNumber: identityDocument.documentNumber,
        documentFileName: identityDocument.fileName || 'document.pdf',
        documentFileSize: identityDocument.fileSize || 1024,
        documentUrl: identityDocument.fileData || '',
        submittedAt: new Date(),
      };
      accountVerificationStatus = 'Pending Verification';
    }

    // Create user (password is automatically hashed via UserSchema.pre('save'))
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: finalRole,
      phoneNumber: cleanPhone,
      countryCode,
      dateOfBirth,
      age,
      avatarUrl: avatarUrl || '',
      avatarBgColor: finalRole === 'teacher' ? '#059669' : '#0284c7',
      headline: headline || '',
      bio: bio || '',
      location: location || '',
      languages: Array.isArray(languages) ? languages : ['English'],
      learningInterests: Array.isArray(learningInterests) ? learningInterests : [],
      identityVerification: identityVerificationData,
      accountVerificationStatus,
    });

    // Generate JWT token
    const token = generateToken(newUser._id, newUser.email, newUser.role);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: newUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Fetch user and explicitly select password
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({
        success: false,
        message: 'This account has been suspended. Please contact support.',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const token = generateToken(user._id, user.email, user.role);

    // Remove password before returning
    const userJson = user.toJSON();

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        user: userJson,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are required.' });
      return;
    }

    const user = await User.findById(req.user?._id).select('+password');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
