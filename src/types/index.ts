/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'learner' | 'teacher' | 'admin';

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type SkillVerificationStatus = 'Unverified' | 'Pending' | 'Verified';

export type CertificateStatus = 'Pending' | 'Verified' | 'Rejected';

export type AppointmentStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed';

export type SessionFormat = '1-on-1 Video' | 'Interactive Workshop' | 'Practice Lab';

export type PaymentStatus = 'Pending' | 'Completed' | 'Failed' | 'Refunded';

export type RefundStatus = 'None' | 'Requested' | 'Under Review' | 'Approved' | 'Rejected' | 'Refunded';

export type ComplaintCategory = 'Harassment' | 'No-Show' | 'Inappropriate Content' | 'Fraud / Payment Issue' | 'Poor Quality' | 'Other';

export type ComplaintStatus = 'Submitted' | 'Under Review' | 'Resolved' | 'Rejected';

export type NotificationCategory = 'Appointments' | 'Sessions' | 'Messages' | 'Verifications' | 'Payments' | 'Complaints' | 'Announcements';

export interface UserSkill {
  id: string;
  name: string;
  category: string;
  description: string;
  proficiency: ProficiencyLevel;
  yearsExperience: number;
  freeSwapAvailable: boolean;
  paidLessonAvailable: boolean;
  hourlyPrice: number; // in USD
  availabilitySchedule: string; // e.g. "Weekdays 6-9 PM, Sat mornings"
  verificationStatus: SkillVerificationStatus;
}

export interface Certificate {
  id: string;
  userId: string;
  title: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
  relatedSkill: string;
  documentUrl?: string;
  fileName?: string;
  status: CertificateStatus;
  rejectionReason?: string;
  submittedAt: string;
}

export interface UserExperience {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface UserEducation {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  avatarBgColor: string;
  headline: string;
  bio: string;
  location: string;
  languages: string[];
  teachingSkills: UserSkill[];
  learningInterests: string[]; // skill names wanted
  certificates: Certificate[];
  experience: UserExperience[];
  education: UserEducation[];
  portfolioLinks: { title: string; url: string }[];
  cvFileName?: string;
  isProfileVerified: boolean;
  isSuspended: boolean;
  twoFactorEnabled: boolean;
  profileVisibility: 'public' | 'members-only' | 'private';
  rating: number; // calculated
  reviewCount: number; // calculated
  completedSessionsCount: number;
  totalEarnings: number; // simulated
  createdAt: string;
}

export interface Appointment {
  id: string;
  learnerId: string;
  learnerName: string;
  teacherId: string;
  teacherName: string;
  skillId: string;
  skillName: string;
  requestedDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number; // 30, 60, 90
  isFreeSwap: boolean;
  offeredSwapSkillName?: string;
  hourlyPrice: number;
  totalCost: number;
  message: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  createdAt: string;
  meetingId?: string;
}

export interface ClassSession {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  skillName: string;
  category: string;
  description: string;
  dateTime: string; // ISO string
  durationMinutes: number;
  capacity: number;
  enrolledUserIds: string[];
  isFree: boolean;
  price: number;
  format: SessionFormat;
  meetingLink: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  cancellationReason?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  attachmentName?: string;
  attachmentSize?: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessageText: string;
  lastMessageTimestamp: string;
  unreadCountForUser: Record<string, number>;
}

export interface Review {
  id: string;
  sessionId: string;
  sessionTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'learner' | 'teacher';
  reviewedUserId: string;
  reviewedUserName: string;
  skillName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  isFlagged: boolean;
  flagReason?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName: string;
  sessionId?: string;
  appointmentId?: string;
  itemTitle: string;
  amount: number;
  currency: string;
  paymentMethodLast4: string;
  status: PaymentStatus;
  refundStatus: RefundStatus;
  refundReason?: string;
  createdAt: string;
  refundRequestedAt?: string;
}

export interface Complaint {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  category: ComplaintCategory;
  description: string;
  evidenceFileName?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'session' | 'message' | 'review' | 'user';
  status: ComplaintStatus;
  submittedAt: string;
  adminResponse?: string;
  adminInternalNotes?: string;
  resolvedAt?: string;
}

export interface PlatformNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  badge: string;
  publishedDate: string;
  isActive: boolean;
  authorName: string;
}

export interface MatchResult {
  matchedUser: UserProfile;
  matchScore: number; // 0 - 100
  isMutualSwap: boolean;
  theyTeachWhatYouWant: string[];
  youTeachWhatTheyWant: string[];
  sharedInterests: string[];
  matchReasons: string[];
  availabilityMatchScore: number;
  priceOption: 'Free Swap Available' | 'Paid Lessons Only' | 'Both Available';
}
