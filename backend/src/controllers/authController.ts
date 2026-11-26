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
      countryCode,
      dateOfBirth,
      identityDocument,
      avatarUrl,
      bio,
      headline,
      location,
      languages,
      learningInterests,
    } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
      return;
    }

    // Compute age if dateOfBirth provided
    let age: number | undefined;
    if (dateOfBirth) {
      const birth = new Date(dateOfBirth);
      const diff = Date.now() - birth.getTime();
      age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
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

    // Create user
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      phoneNumber,
      countryCode,
      dateOfBirth,
      age,
      avatarUrl: avatarUrl || '',
      avatarBgColor: role === 'teacher' ? '#059669' : '#0284c7',
      headline: headline || '',
      bio: bio || '',
      location: location || '',
      languages: languages || ['English'],
      learningInterests: learningInterests || [],
      identityVerification: identityVerificationData,
      accountVerificationStatus,
    });

    // Generate JWT
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

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    // Fetch user and explicitly select password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
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
