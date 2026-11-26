import { Request, Response, NextFunction } from 'express';
import { Certificate } from '../models/Certificate.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const createCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const {
      title,
      certificateName,
      issuingOrganization,
      issueDate,
      expirationDate,
      relatedSkill,
      documentUrl,
      certificatePdfUrl,
      fileName,
      fileSize,
      fileData,
    } = req.body;

    const finalTitle = title || certificateName;
    const finalDocUrl = documentUrl || certificatePdfUrl || fileData;

    if (!finalTitle || !issuingOrganization || !issueDate || !relatedSkill) {
      res.status(400).json({
        success: false,
        message: 'Certificate title, issuing organization, issue date, and related skill are required.',
      });
      return;
    }

    const certificate = await Certificate.create({
      userId: req.user._id,
      title: finalTitle,
      issuingOrganization,
      issueDate,
      expirationDate,
      relatedSkill,
      documentUrl: finalDocUrl,
      fileName: fileName || `${finalTitle}.pdf`,
      fileSize: fileSize || 2048,
      fileData,
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      message: 'Certificate uploaded and queued for verification.',
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

export const getCertificatesByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const certificates = await Certificate.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);

    if (!certificate) {
      res.status(404).json({ success: false, message: 'Certificate not found.' });
      return;
    }

    // Must be owner or admin
    if (certificate.userId.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized to delete this certificate.' });
      return;
    }

    await Certificate.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Certificate removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
