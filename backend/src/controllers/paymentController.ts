import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PaymentTransaction, DemoPaymentMethod } from '../models/PaymentTransaction.js';
import { ClassSession } from '../models/ClassSession.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { emitToUser } from '../socket.js';

const VALID_METHODS: DemoPaymentMethod[] = ['Visa', 'Mastercard', 'PayPal', 'bKash', 'Nagad'];

const adaptTransaction = (tx: any) => ({
  id: tx._id.toString(),
  transactionId: tx.transactionId,
  orderId: tx.orderId,
  userId: tx.studentId?.toString?.() || tx.studentId,
  userName: tx.studentName,
  studentId: tx.studentId?.toString?.() || tx.studentId,
  studentName: tx.studentName,
  teacherId: tx.teacherId?.toString?.() || tx.teacherId,
  teacherName: tx.teacherName,
  sessionId: tx.classId ? tx.classId.toString() : undefined,
  classId: tx.classId ? tx.classId.toString() : undefined,
  appointmentId: tx.appointmentId ? tx.appointmentId.toString() : undefined,
  itemTitle: tx.itemTitle,
  itemDescription: tx.itemDescription || '',
  paymentMethod: tx.paymentMethod,
  paymentMethodLast4: tx.paymentMethod,
  amount: tx.amount,
  currency: tx.currency || 'USD',
  status: tx.status,
  isDemo: Boolean(tx.isDemo),
  refundStatus: tx.refundStatus || 'None',
  refundReason: tx.refundReason || '',
  refundExplanation: tx.refundExplanation || '',
  adminResponse: tx.adminResponse || '',
  createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
  refundRequestedAt: tx.refundRequestedAt ? new Date(tx.refundRequestedAt).toISOString() : undefined,
  refundProcessedAt: tx.refundProcessedAt ? new Date(tx.refundProcessedAt).toISOString() : undefined,
});

export const getPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const filter =
      req.user.role === 'admin'
        ? {}
        : req.user.role === 'teacher'
        ? { $or: [{ studentId: req.user._id }, { teacherId: req.user._id }] }
        : { studentId: req.user._id };

    const transactions = await PaymentTransaction.find(filter).sort({ createdAt: -1 });
    const adapted = transactions.map(adaptTransaction);

    res.status(200).json({
      success: true,
      count: adapted.length,
      data: adapted,
    });
  } catch (error) {
    next(error);
  }
};

export const createDemoCheckout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { classId, paymentMethod, demoOutcome = 'Success' } = req.body;

    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400).json({ success: false, message: 'A valid workshop/class ID is required.' });
      return;
    }

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        message: `Payment method must be one of: ${VALID_METHODS.join(', ')}.`,
      });
      return;
    }

    if (!['Success', 'Failed', 'Cancelled'].includes(demoOutcome)) {
      res.status(400).json({ success: false, message: 'Invalid demo payment outcome.' });
      return;
    }

    const cls = await ClassSession.findById(classId);
    if (!cls) {
      res.status(404).json({ success: false, message: 'Class/Workshop not found.' });
      return;
    }

    if (cls.status !== 'Scheduled') {
      res.status(400).json({ success: false, message: 'This class is no longer open for enrollment.' });
      return;
    }

    if (cls.teacherId.toString() === req.user._id.toString()) {
      res.status(400).json({ success: false, message: 'You cannot purchase your own class.' });
      return;
    }

    const alreadyEnrolled = cls.enrolledUserIds.some((uid) => uid.toString() === req.user!._id.toString());
    if (alreadyEnrolled) {
      res.status(409).json({ success: false, message: 'You are already enrolled in this class.' });
      return;
    }

    if (cls.enrolledUserIds.length >= cls.capacity) {
      res.status(400).json({ success: false, message: 'This class has reached maximum capacity.' });
      return;
    }

    const existingCompleted = await PaymentTransaction.findOne({
      studentId: req.user._id,
      classId: cls._id,
      status: 'Completed',
    });

    if (existingCompleted) {
      res.status(409).json({
        success: false,
        message: 'A completed demo payment already exists for this class.',
      });
      return;
    }

    const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const transactionId = `DEMO-TXN-${Date.now().toString().slice(-6)}-${randSuffix}`;
    const orderId = `ORD-${Date.now().toString().slice(-6)}-${randSuffix}`;

    const finalStatus =
      demoOutcome === 'Success'
        ? 'Completed'
        : demoOutcome === 'Failed'
        ? 'Failed'
        : 'Cancelled';

    const tx = await PaymentTransaction.create({
      transactionId,
      orderId,
      studentId: req.user._id,
      studentName: req.user.name,
      teacherId: cls.teacherId,
      teacherName: cls.teacherName,
      classId: cls._id,
      itemTitle: cls.title,
      itemDescription: cls.description,
      paymentMethod,
      amount: cls.isFree ? 0 : cls.price,
      currency: 'USD',
      status: finalStatus,
      isDemo: true,
      refundStatus: 'None',
    });

    let updatedClassData: any = undefined;

    if (finalStatus === 'Completed') {
      await ClassSession.findByIdAndUpdate(cls._id, {
        $addToSet: { enrolledUserIds: req.user._id },
      });

      await User.findByIdAndUpdate(cls.teacherId, {
        $inc: { totalEarnings: cls.isFree ? 0 : cls.price },
      });

      const refreshedClass = await ClassSession.findById(cls._id);
      if (refreshedClass) {
        const enrolledStrs = refreshedClass.enrolledUserIds.map((u) => u.toString());
        updatedClassData = {
          id: refreshedClass._id.toString(),
          teacherId: refreshedClass.teacherId.toString(),
          teacherName: refreshedClass.teacherName,
          title: refreshedClass.title,
          skillName: refreshedClass.skillName,
          category: refreshedClass.category,
          description: refreshedClass.description,
          dateTime: refreshedClass.dateTime.toISOString(),
          durationMinutes: refreshedClass.durationMinutes,
          capacity: refreshedClass.capacity,
          enrolledCount: enrolledStrs.length,
          enrolledUserIds: [req.user._id.toString()],
          isFree: refreshedClass.isFree,
          price: refreshedClass.price,
          format: refreshedClass.format,
          meetingLink: refreshedClass.meetingLink,
          thumbnailUrl: refreshedClass.thumbnailUrl,
          instructions: refreshedClass.instructions,
          status: refreshedClass.status,
        };
      }

      const teacherNotif = await Notification.create({
        userId: cls.teacherId,
        title: 'New Paid Demo Enrollment',
        message: `${req.user.name} completed a simulated ${paymentMethod} payment ($${cls.price} USD) for "${cls.title}".`,
        category: 'Payments',
        actionUrl: `/classes?classId=${cls._id.toString()}`,
      });
      emitToUser(cls.teacherId.toString(), 'notification:received', teacherNotif);
    }

    res.status(201).json({
      success: true,
      message:
        finalStatus === 'Completed'
          ? 'Simulated payment succeeded and enrollment confirmed.'
          : finalStatus === 'Failed'
          ? 'Simulated payment failed. No enrollment was granted.'
          : 'Simulated payment was cancelled. No enrollment was granted.',
      data: {
        transaction: adaptTransaction(tx),
        updatedClass: updatedClassData,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const requestDemoRefund = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;
    const { reason, explanation = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid transaction ID.' });
      return;
    }

    if (!reason || !String(reason).trim()) {
      res.status(400).json({ success: false, message: 'Refund reason is required.' });
      return;
    }

    const tx = await PaymentTransaction.findById(id);
    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }

    if (tx.studentId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'You can only request a refund for your own transaction.' });
      return;
    }

    if (tx.status !== 'Completed') {
      res.status(400).json({ success: false, message: 'Only completed transactions are eligible for a refund request.' });
      return;
    }

    if (tx.refundStatus !== 'None') {
      res.status(409).json({
        success: false,
        message: `A refund request is already ${tx.refundStatus.toLowerCase()} for this transaction.`,
      });
      return;
    }

    tx.refundStatus = 'Requested';
    tx.refundReason = String(reason).trim();
    tx.refundExplanation = String(explanation || '').trim();
    tx.refundRequestedAt = new Date();
    await tx.save();

    res.status(200).json({
      success: true,
      message: 'Demo refund request submitted for Admin review.',
      data: adaptTransaction(tx),
    });
  } catch (error) {
    next(error);
  }
};

export const reviewDemoRefund = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, adminResponse = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid transaction ID.' });
      return;
    }

    if (!['Under Review', 'Approved', 'Rejected', 'Refunded'].includes(decision)) {
      res.status(400).json({
        success: false,
        message: 'Decision must be Under Review, Approved, Rejected, or Refunded.',
      });
      return;
    }

    const tx = await PaymentTransaction.findById(id);
    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }

    tx.adminResponse = String(adminResponse || '').trim();

    if (decision === 'Approved' || decision === 'Refunded') {
      tx.status = 'Refunded';
      tx.refundStatus = 'Refunded';
      tx.refundProcessedAt = new Date();

      // Revoke class enrollment upon processed refund
      if (tx.classId) {
        await ClassSession.findByIdAndUpdate(tx.classId, {
          $pull: { enrolledUserIds: tx.studentId },
        });
      }

      // Safely decrement teacher's simulated earnings
      const teacher = await User.findById(tx.teacherId).select('totalEarnings');
      if (teacher) {
        teacher.totalEarnings = Math.max(0, (teacher.totalEarnings || 0) - tx.amount);
        await teacher.save();
      }
    } else {
      tx.refundStatus = decision;
    }

    await tx.save();

    const studentNotif = await Notification.create({
      userId: tx.studentId,
      title: `Demo Refund ${tx.refundStatus}`,
      message: `Your demo refund request for "${tx.itemTitle}" (${tx.transactionId}) is now ${tx.refundStatus}.${tx.adminResponse ? ` Note: ${tx.adminResponse}` : ''}`,
      category: 'Payments',
      actionUrl: '/payments',
    });
    emitToUser(tx.studentId.toString(), 'notification:received', studentNotif);

    res.status(200).json({
      success: true,
      message: `Demo refund updated to ${tx.refundStatus}.`,
      data: adaptTransaction(tx),
    });
  } catch (error) {
    next(error);
  }
};
