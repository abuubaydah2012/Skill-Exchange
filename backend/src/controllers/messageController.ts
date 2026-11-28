import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { Skill } from '../models/Skill.js';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { emitToUser } from '../socket.js';

export const getConversations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const userId = req.user._id;
    const conversations = await Conversation.find({
      participantIds: userId,
      deletedFor: { $ne: userId },
    })
      .populate('participantIds', 'name email avatarUrl avatarBgColor role')
      .sort({ lastMessageTimestamp: -1, updatedAt: -1 });

    const adapted = conversations.map((c) => {
      const unreadMap = c.unreadCountForUser instanceof Map
        ? Object.fromEntries(c.unreadCountForUser)
        : (c.unreadCountForUser || {});

      return {
        id: c._id.toString(),
        participantIds: (c.participantIds as any[]).map((p) => (p._id ? p._id.toString() : p.toString())),
        participants: c.participantIds,
        appointmentId: c.appointmentId ? c.appointmentId.toString() : undefined,
        teacherId: c.teacherId ? c.teacherId.toString() : undefined,
        studentId: c.studentId ? c.studentId.toString() : undefined,
        lastMessageText: c.lastMessageText || '',
        lastMessageTimestamp: c.lastMessageTimestamp
          ? new Date(c.lastMessageTimestamp).toISOString()
          : new Date(c.updatedAt).toISOString(),
        unreadCountForUser: unreadMap,
        deletedFor: (c.deletedFor || []).map((d) => d.toString()),
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

export const getOrCreateAppointmentConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { appointmentId } = req.body;
    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      res.status(400).json({ success: false, message: 'Valid appointment ID is required.' });
      return;
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const teacherIdStr = appointment.teacherId.toString();
    const studentIdStr = appointment.learnerId.toString();

    if (userIdStr !== teacherIdStr && userIdStr !== studentIdStr && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden: You are not a participant of this appointment.' });
      return;
    }

    // Status rules: Pending & Rejected cannot start appointment messaging
    if (appointment.status === 'Pending' || appointment.status === 'Rejected') {
      res.status(403).json({
        success: false,
        message: `Messaging is not available for ${appointment.status.toLowerCase()} appointments.`,
      });
      return;
    }

    // Find existing conversation by appointmentId first, then by participant pair to prevent duplicates
    let conversation = await Conversation.findOne({
      $or: [
        { appointmentId: appointment._id },
        { participantIds: { $all: [appointment.teacherId, appointment.learnerId] } },
      ],
    });

    // Cancelled appointments: preserve existing history if one exists, do not create a new one
    if (appointment.status === 'Cancelled' && !conversation) {
      res.status(403).json({
        success: false,
        message: 'Cannot start a new conversation for a cancelled appointment.',
      });
      return;
    }

    if (!conversation) {
      conversation = await Conversation.create({
        participantIds: [appointment.teacherId, appointment.learnerId],
        appointmentId: appointment._id,
        teacherId: appointment.teacherId,
        studentId: appointment.learnerId,
        lastMessageText: '',
        lastMessageTimestamp: new Date(),
        unreadCountForUser: new Map([
          [teacherIdStr, 0],
          [studentIdStr, 0],
        ]),
        deletedFor: [],
      });
    } else {
      let dirty = false;
      if (!conversation.appointmentId || conversation.appointmentId.toString() !== appointment._id.toString()) {
        // Update linked appointment if current appointment is Accepted or Completed
        if (appointment.status === 'Accepted' || appointment.status === 'Completed') {
          conversation.appointmentId = appointment._id;
          dirty = true;
        }
      }
      if (!conversation.teacherId) {
        conversation.teacherId = appointment.teacherId;
        dirty = true;
      }
      if (!conversation.studentId) {
        conversation.studentId = appointment.learnerId;
        dirty = true;
      }
      if (conversation.deletedFor?.some((d) => d.toString() === userIdStr)) {
        conversation.deletedFor = conversation.deletedFor.filter((d) => d.toString() !== userIdStr);
        dirty = true;
      }
      if (dirty) {
        await conversation.save();
      }
    }

    await conversation.populate('participantIds', 'name email avatarUrl avatarBgColor role');

    const unreadMap = conversation.unreadCountForUser instanceof Map
      ? Object.fromEntries(conversation.unreadCountForUser)
      : (conversation.unreadCountForUser || {});

    const adapted = {
      id: conversation._id.toString(),
      participantIds: (conversation.participantIds as any[]).map((p) => (p._id ? p._id.toString() : p.toString())),
      participants: conversation.participantIds,
      appointmentId: conversation.appointmentId ? conversation.appointmentId.toString() : undefined,
      teacherId: conversation.teacherId ? conversation.teacherId.toString() : undefined,
      studentId: conversation.studentId ? conversation.studentId.toString() : undefined,
      lastMessageText: conversation.lastMessageText || '',
      lastMessageTimestamp: conversation.lastMessageTimestamp
        ? new Date(conversation.lastMessageTimestamp).toISOString()
        : new Date(conversation.updatedAt).toISOString(),
      unreadCountForUser: unreadMap,
      deletedFor: (conversation.deletedFor || []).map((d) => d.toString()),
    };

    res.status(200).json({
      success: true,
      data: adapted,
    });
  } catch (error) {
    next(error);
  }
};

export const getMessagesByConversation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'Invalid conversation ID format.' });
      return;
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    const isParticipant = conv.participantIds.some((p) => p.toString() === userId.toString());
    if (!isParticipant && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
      return;
    }

    const messages = await Message.find({ conversationId: conv._id })
      .populate('senderId', 'name avatarUrl avatarBgColor')
      .populate('receiverId', 'name avatarUrl avatarBgColor')
      .sort({ createdAt: 1 });

    const adapted = messages.map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId: (m.senderId as any)?._id?.toString() || m.senderId.toString(),
      senderName: (m.senderId as any)?.name || 'User',
      receiverId: (m.receiverId as any)?._id?.toString() || m.receiverId.toString(),
      text: m.text || '',
      attachmentName: m.attachmentName,
      attachmentSize: m.attachmentSize,
      timestamp: m.createdAt.toISOString(),
      isRead: m.isRead,
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

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { receiverId, text, attachmentName, attachmentSize, appointmentId } = req.body;

    if (!receiverId) {
      res.status(400).json({ success: false, message: 'Receiver ID is required.' });
      return;
    }

    if ((!text || text.trim().length === 0) && !attachmentName) {
      res.status(400).json({ success: false, message: 'Message text or attachment is required.' });
      return;
    }

    // Resolve receiver
    let receiver = null;
    if (mongoose.Types.ObjectId.isValid(receiverId)) {
      receiver = await User.findById(receiverId);
    }
    if (!receiver) {
      // Fallback search by email or demo role
      receiver = await User.findOne({
        $or: [
          { email: receiverId },
          { role: receiverId === 'usr-teacher' ? 'teacher' : receiverId === 'usr-learner' ? 'learner' : 'admin' },
        ],
      });
    }

    if (!receiver) {
      res.status(404).json({ success: false, message: 'Recipient user not found.' });
      return;
    }

    if (receiver._id.toString() === req.user._id.toString()) {
      res.status(400).json({ success: false, message: 'You cannot send a message to yourself.' });
      return;
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participantIds: { $all: [req.user._id, receiver._id] },
    });

    // Enforce appointment status rules if linked to an appointment
    const effectiveAppointmentId = appointmentId || conversation?.appointmentId?.toString();
    let resolvedAppointment: any = null;
    if (effectiveAppointmentId && mongoose.Types.ObjectId.isValid(effectiveAppointmentId)) {
      resolvedAppointment = await Appointment.findById(effectiveAppointmentId);
      if (resolvedAppointment) {
        if (
          resolvedAppointment.status === 'Cancelled' ||
          resolvedAppointment.status === 'Rejected' ||
          resolvedAppointment.status === 'Pending'
        ) {
          res.status(403).json({
            success: false,
            message: `New messages are not allowed for ${resolvedAppointment.status.toLowerCase()} appointments.`,
          });
          return;
        }
      }
    }

    const now = new Date();
    const cleanText = (text || '').trim();
    const displayMsg = cleanText || (attachmentName ? `Attachment: ${attachmentName}` : '');

    if (!conversation) {
      conversation = await Conversation.create({
        participantIds: [req.user._id, receiver._id],
        ...(resolvedAppointment
          ? {
              appointmentId: resolvedAppointment._id,
              teacherId: resolvedAppointment.teacherId,
              studentId: resolvedAppointment.learnerId,
            }
          : {}),
        lastMessageText: displayMsg,
        lastMessageTimestamp: now,
        unreadCountForUser: new Map([
          [req.user._id.toString(), 0],
          [receiver._id.toString(), 1],
        ]),
        deletedFor: [],
      });
    } else {
      if (resolvedAppointment) {
        conversation.appointmentId = resolvedAppointment._id;
        conversation.teacherId = resolvedAppointment.teacherId;
        conversation.studentId = resolvedAppointment.learnerId;
      }
      conversation.lastMessageText = displayMsg;
      conversation.lastMessageTimestamp = now;
      // If conversation was hidden/soft-deleted by either participant, restore inbox visibility upon new message
      conversation.deletedFor = [];
      const currentUnread = conversation.unreadCountForUser?.get(receiver._id.toString()) || 0;
      conversation.unreadCountForUser.set(receiver._id.toString(), currentUnread + 1);
      await conversation.save();
    }

    // Create message record
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      receiverId: receiver._id,
      text: cleanText,
      attachmentName,
      attachmentSize,
      isRead: false,
    });

    // Create notification for receiver
    await Notification.create({
      userId: receiver._id,
      title: `New message from ${req.user.name}`,
      message: cleanText.length > 60 ? `${cleanText.substring(0, 57)}...` : cleanText || 'Sent an attachment',
      category: 'Messages',
      actionUrl: '/messages',
    });

    const adaptedMessage = {
      id: message._id.toString(),
      conversationId: conversation._id.toString(),
      senderId: req.user._id.toString(),
      senderName: req.user.name,
      receiverId: receiver._id.toString(),
      text: message.text,
      attachmentName: message.attachmentName,
      attachmentSize: message.attachmentSize,
      timestamp: message.createdAt.toISOString(),
      isRead: message.isRead,
    };

    const unreadMap = conversation.unreadCountForUser instanceof Map
      ? Object.fromEntries(conversation.unreadCountForUser)
      : (conversation.unreadCountForUser || {});

    const adaptedConversation = {
      id: conversation._id.toString(),
      participantIds: conversation.participantIds.map((p) => (p._id ? p._id.toString() : p.toString())),
      appointmentId: conversation.appointmentId ? conversation.appointmentId.toString() : undefined,
      teacherId: conversation.teacherId ? conversation.teacherId.toString() : undefined,
      studentId: conversation.studentId ? conversation.studentId.toString() : undefined,
      lastMessageText: conversation.lastMessageText,
      lastMessageTimestamp: conversation.lastMessageTimestamp.toISOString(),
      unreadCountForUser: unreadMap,
      deletedFor: (conversation.deletedFor || []).map((d) => d.toString()),
    };

    // Emit real-time events via Socket.IO
    // 1. Deliver message in real time to the receiver's private room
    emitToUser(receiver._id.toString(), 'message:received', adaptedMessage);
    // 2. Update conversation preview and unread counters for both receiver and sender
    emitToUser(receiver._id.toString(), 'conversation:updated', adaptedConversation);
    emitToUser(req.user._id.toString(), 'conversation:updated', adaptedConversation);
    // 3. Sync sender's other open tabs or sessions
    emitToUser(req.user._id.toString(), 'message:received', adaptedMessage);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: {
        message: adaptedMessage,
        conversation: adaptedConversation,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markConversationAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'Invalid conversation ID format.' });
      return;
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    // Mark messages where receiver is current user as read
    await Message.updateMany(
      { conversationId: conv._id, receiverId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // Reset unread count for current user
    if (conv.unreadCountForUser) {
      conv.unreadCountForUser.set(userId.toString(), 0);
      await conv.save();
    }

    // Emit real-time read event to participants
    const readEventData = {
      conversationId: conv._id.toString(),
      readerId: userId.toString(),
    };
    conv.participantIds.forEach((pid) => {
      emitToUser(pid.toString(), 'conversation:read', readEventData);
    });

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConversationForUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'Invalid conversation ID format.' });
      return;
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    const isParticipant = conv.participantIds.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden: You are not a participant in this conversation.' });
      return;
    }

    // Soft delete for this user only by pushing userId to deletedFor
    await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: { deletedFor: userId },
    });

    // Notify other connected sessions of current user via Socket.IO
    emitToUser(userId.toString(), 'conversation:deleted', { conversationId });

    res.status(200).json({
      success: true,
      message: 'Conversation deleted from your inbox successfully.',
      data: { conversationId },
    });
  } catch (error) {
    next(error);
  }
};

export const searchTeachers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { search } = req.query;
    const currentUserId = req.user._id;

    // Filter: only teachers, not suspended, exclude currently authenticated user
    const userFilter: any = {
      role: 'teacher',
      isSuspended: { $ne: true },
      _id: { $ne: currentUserId },
    };

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();

      // Find skills matching term
      const matchingSkills = await Skill.find({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { title: { $regex: term, $options: 'i' } },
          { category: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
        ],
      }).select('userId');

      const userIdsFromSkills = matchingSkills.map((s) => s.userId);

      userFilter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { headline: { $regex: term, $options: 'i' } },
        { bio: { $regex: term, $options: 'i' } },
        { location: { $regex: term, $options: 'i' } },
        { languages: { $regex: term, $options: 'i' } },
        { _id: { $in: userIdsFromSkills } },
      ];
    }

    const teachers = await User.find(userFilter)
      .select('name email role avatarUrl avatarBgColor headline bio location languages rating reviewCount accountVerificationStatus isProfileVerified createdAt')
      .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
      .limit(30);

    const teacherIds = teachers.map((t) => t._id);
    const skills = await Skill.find({ userId: { $in: teacherIds } });

    const adapted = teachers.map((t) => {
      const tSkills = skills.filter((s) => s.userId.toString() === t._id.toString());
      return {
        id: t._id.toString(),
        name: t.name,
        email: t.email,
        role: t.role,
        avatarUrl: t.avatarUrl || '',
        avatarBgColor: t.avatarBgColor || '#059669',
        headline: t.headline || '',
        bio: t.bio || '',
        location: t.location || '',
        languages: t.languages || ['English'],
        rating: t.rating || 5.0,
        reviewCount: t.reviewCount || 0,
        isProfileVerified: Boolean(t.isProfileVerified),
        accountVerificationStatus: t.accountVerificationStatus || 'Verified',
        teachingSkills: tSkills.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          category: s.category,
          hourlyPrice: s.hourlyPrice || 0,
          proficiency: s.proficiency || 'Expert',
        })),
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
