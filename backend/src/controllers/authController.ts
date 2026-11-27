import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Skill } from '../models/Skill.js';
import { Certificate } from '../models/Certificate.js';
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
      certificates,
    } = req.body;

    console.log(`[Auth API] Registration request received: email=${email}, role=${role || 'learner'}`);

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      console.warn(`[Auth API] Registration rejected: invalid name provided`);
      res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters long.',
      });
      return;
    }

    if (!email || typeof email !== 'string') {
      console.warn(`[Auth API] Registration rejected: missing email`);
      res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(cleanEmail)) {
      console.warn(`[Auth API] Registration rejected: malformed email "${cleanEmail}"`);
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      console.warn(`[Auth API] Registration rejected: password too short`);
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
      console.warn(`[Auth API] Registration rejected: email already exists "${cleanEmail}"`);
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
        console.warn(`[Auth API] Registration rejected: phone already exists "${cleanPhone}"`);
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
    if (identityDocument && (identityDocument.documentNumber || identityDocument.documentFileName || identityDocument.fileName)) {
      const docType =
        identityDocument.type ||
        identityDocument.documentType ||
        (age && age < 18 ? 'Birth Certificate' : 'National ID (NID)');
      const docNum = (identityDocument.documentNumber || '').trim();
      const docFileName = identityDocument.fileName || identityDocument.documentFileName || 'document.pdf';
      const docFileSize = identityDocument.fileSize || identityDocument.documentFileSize || 1024;
      const docUrl = identityDocument.fileData || identityDocument.documentUrl || '';

      identityVerificationData = {
        status: 'Pending',
        documentType: docType,
        documentNumber: docNum,
        documentFileName: docFileName,
        documentFileSize: docFileSize,
        documentUrl: docUrl,
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

    // Save submitted certificates to the Certificate collection linked to newUser._id
    const createdCertificates = [];
    if (Array.isArray(certificates) && certificates.length > 0) {
      for (const cert of certificates) {
        if (!cert || typeof cert !== 'object') continue;
        const certTitle = (cert.title || cert.fileName?.replace(/\.pdf$/i, '') || 'Professional Certificate').trim();
        const issuingOrg = (cert.issuingOrganization || 'Verified Educational/Professional Institution').trim();
        const issueDate = cert.issueDate || new Date().toISOString().split('T')[0];
        const relatedSkill = (cert.relatedSkill || certTitle || 'General Credential').trim();
        const fileData = cert.fileData || cert.documentUrl || '';
        const fileName = cert.fileName || `${certTitle}.pdf`;
        const fileSize = typeof cert.fileSize === 'number' ? cert.fileSize : (fileData ? Math.round(fileData.length * 0.75) : 1024);

        const newCert = await Certificate.create({
          userId: newUser._id,
          title: certTitle,
          issuingOrganization: issuingOrg,
          issueDate,
          expirationDate: cert.expirationDate,
          relatedSkill,
          documentUrl: fileData,
          fileData,
          fileName,
          fileSize,
          status: 'Pending',
          submittedAt: new Date(),
        });
        createdCertificates.push(newCert);
      }
    }

    // Generate JWT token
    const token = generateToken(newUser._id, newUser.email, newUser.role);
    console.log(`[Auth API] Registration successful: userId=${newUser._id}, email=${newUser.email}, role=${newUser.role}`);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: newUser,
        certificates: createdCertificates,
        token,
      },
    });
  } catch (error) {
    console.error(`[Auth API] Registration error caught:`, error);
    next(error);
  }
};

export const checkEmailAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = req.query.email as string;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'Email parameter is required.' });
      return;
    }
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    const message = existing
      ? 'An account with this email address already exists.'
      : 'Email is available.';

    res.status(200).json({
      success: true,
      available: !existing,
      message,
      data: {
        available: !existing,
        message,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, identifier } = req.body;
    const loginIdentifier = (identifier || email);

    if (!loginIdentifier || typeof loginIdentifier !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email or phone number and password are required.',
      });
      return;
    }

    const cleanIdentifier = loginIdentifier.trim();
    const cleanEmail = cleanIdentifier.toLowerCase();
    const normalizedPhone = cleanIdentifier.replace(/[\s\-()]/g, '');

    // Fetch user by email or phoneNumber and explicitly select password
    const user = await User.findOne({
      $or: [
        { email: cleanEmail },
        { phoneNumber: cleanIdentifier },
        { phoneNumber: normalizedPhone },
      ],
    }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email, phone number, or password.',
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
        message: 'Invalid email, phone number, or password.',
      });
      return;
    }

    const token = generateToken(user._id, user.email, user.role);

    // Remove password and attach populated data
    const userJson: any = user.toJSON();
    userJson.id = user._id.toString();

    const skills = await Skill.find({ userId: user._id });
    userJson.teachingSkills = skills.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      category: s.category,
      description: s.description,
      proficiency: s.proficiency,
      yearsExperience: s.yearsExperience || 1,
      freeSwapAvailable: Boolean(s.freeSwapAvailable),
      paidLessonAvailable: Boolean(s.paidLessonAvailable),
      hourlyPrice: s.hourlyPrice || 0,
      availabilitySchedule: s.availabilitySchedule || 'Flexible schedule',
      verificationStatus: s.verificationStatus || 'Verified',
    }));

    const certs = await Certificate.find({ userId: user._id });
    userJson.certificates = certs.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      issuingOrganization: c.issuingOrganization,
      issueDate: c.issueDate,
      expirationDate: c.expirationDate,
      credentialUrl: c.documentUrl,
      documentUrl: c.documentUrl,
      fileName: c.fileName,
      fileSize: c.fileSize,
      status: c.status,
      submittedAt: c.submittedAt,
    }));

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

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(401).json({ success: false, message: 'User account not found.' });
      return;
    }

    const userJson: any = user.toJSON();
    userJson.id = user._id.toString();

    const skills = await Skill.find({ userId: user._id });
    userJson.teachingSkills = skills.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      category: s.category,
      description: s.description,
      proficiency: s.proficiency,
      yearsExperience: s.yearsExperience || 1,
      freeSwapAvailable: Boolean(s.freeSwapAvailable),
      paidLessonAvailable: Boolean(s.paidLessonAvailable),
      hourlyPrice: s.hourlyPrice || 0,
      availabilitySchedule: s.availabilitySchedule || 'Flexible schedule',
      verificationStatus: s.verificationStatus || 'Verified',
    }));

    const certs = await Certificate.find({ userId: user._id });
    userJson.certificates = certs.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      issuingOrganization: c.issuingOrganization,
      issueDate: c.issueDate,
      expirationDate: c.expirationDate,
      credentialUrl: c.documentUrl,
      documentUrl: c.documentUrl,
      fileName: c.fileName,
      fileSize: c.fileSize,
      status: c.status,
      submittedAt: c.submittedAt,
    }));

    res.status(200).json({
      success: true,
      data: userJson,
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
