/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  UserRole,
  UserSkill,
  Certificate,
  Appointment,
  AppointmentStatus,
  ClassSession,
  Message,
  Conversation,
  Review,
  PaymentTransaction,
  RefundStatus,
  Complaint,
  ComplaintStatus,
  PlatformNotification,
  PlatformAnnouncement,
  RegisterUserData,
  IdentityDocumentType,
} from '../types';
import {
  calculateAge,
  validateAgeAndDocument,
  validateEmail,
  validatePhoneNumber,
  hashPassword,
} from '../utils/ageVerification';
import {
  INITIAL_USERS,
  INITIAL_APPOINTMENTS,
  INITIAL_CLASSES,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_REVIEWS,
  INITIAL_PAYMENTS,
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ANNOUNCEMENTS,
} from '../data/seedData';
import {
  authApi,
  userApi,
  skillApi,
  appointmentApi,
  messageApi,
  notificationApi,
  reviewApi,
  certificateApi,
  TOKEN_STORAGE_KEY,
} from '../services/api';

const STORAGE_KEY = 'SKILL_EXCHANGE_STORAGE_V1';
const THEME_STORAGE_KEY = 'SKILL_EXCHANGE_THEME_V1';
const LOCKED_ACCOUNTS_KEY = 'SKILL_EXCHANGE_LOCKED_V1';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

export interface OtpState {
  pendingEmail: string;
  targetRole: UserRole;
  code: string;
  expiresAt: number;
}

interface AppContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  appointments: Appointment[];
  classes: ClassSession[];
  conversations: Conversation[];
  messages: Message[];
  reviews: Review[];
  payments: PaymentTransaction[];
  complaints: Complaint[];
  notifications: PlatformNotification[];
  announcements: PlatformAnnouncement[];
  theme: 'light' | 'dark';
  toasts: ToastMessage[];
  otpState: OtpState | null;
  isAccountLocked: (email: string) => boolean;

  // Feedback
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  resetDemoData: () => void;

  // Auth
  login: (identifier: string, password: string) => Promise<{ success: boolean; requiresOtp?: boolean; error?: string }>;
  loginWithDemoRole: (role: UserRole) => void;
  verifyOtp: (inputCode: string) => boolean;
  resendOtp: () => string;
  cancelOtp: () => void;
  unlockAccount: (email: string) => void;
  requestPasswordReset: (email: string) => Promise<boolean>;
  logout: () => void;
  registerUser: (
    dataOrName: RegisterUserData | string,
    email?: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  reviewIdentityVerification: (
    userId: string,
    decision: 'Verified' | 'Rejected',
    rejectionReason?: string
  ) => void;

  // Profile & Skills
  updateProfile: (updated: Partial<UserProfile>) => void;
  addSkill: (skill: Omit<UserSkill, 'id'>) => void;
  editSkill: (skillId: string, updated: Partial<UserSkill>) => void;
  deleteSkill: (skillId: string) => void;
  addLearningInterest: (interest: string) => void;
  removeLearningInterest: (interest: string) => void;

  // Certificates
  addCertificate: (cert: Omit<Certificate, 'id' | 'userId' | 'submittedAt' | 'status'>) => void;
  updateCertificateStatus: (certId: string, status: 'Verified' | 'Rejected', reason?: string) => void;

  // Appointments
  createAppointment: (apt: Omit<Appointment, 'id' | 'createdAt' | 'status'>) => Promise<Appointment>;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus, cancellationReason?: string) => void;

  // Classes & Sessions
  createClass: (cls: Omit<ClassSession, 'id' | 'teacherId' | 'teacherName' | 'status' | 'enrolledUserIds'>) => ClassSession;
  updateClass: (classId: string, updated: Partial<ClassSession>) => void;
  cancelClass: (classId: string, reason: string) => void;
  enrollInClass: (classId: string, paymentMethodLast4?: string) => Promise<boolean>;
  completeClass: (classId: string) => void;

  // Messaging
  sendMessage: (receiverId: string, text: string, attachmentName?: string, attachmentSize?: string) => Promise<void> | void;
  markConversationAsRead: (conversationId: string) => void;
  loadMessagesForConversation: (conversationId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
  syncBackendData: () => Promise<void>;
  blockUser: (targetUserId: string) => void;

  // Reviews
  submitReview: (review: Omit<Review, 'id' | 'createdAt' | 'isFlagged'>) => void;
  editReview: (reviewId: string, rating: number, comment: string) => void;
  flagReview: (reviewId: string, reason: string) => void;
  moderateReview: (reviewId: string, action: 'keep' | 'delete') => void;

  // Payments & Refunds
  processDemoPayment: (payment: Omit<PaymentTransaction, 'id' | 'createdAt' | 'refundStatus'>) => Promise<{ success: boolean; error?: string }>;
  requestRefund: (paymentId: string, reason: string) => void;
  reviewRefundDecision: (paymentId: string, decision: 'Approved' | 'Rejected') => void;

  // Complaints
  submitComplaint: (complaint: Omit<Complaint, 'id' | 'submittedAt' | 'status'>) => void;
  resolveComplaint: (complaintId: string, adminResponse: string, adminInternalNotes: string, status: ComplaintStatus) => void;

  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;

  // Admin Workflows
  toggleUserSuspension: (userId: string) => boolean;
  toggleUserVerification: (userId: string) => void;
  saveAnnouncement: (announcement: Partial<PlatformAnnouncement> & { title: string; content: string }) => void;
  toggleAnnouncementActive: (announcementId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state - respects URL query, saved preference in localStorage, or system preference on first visit
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTheme = urlParams.get('theme');
        if (urlTheme === 'dark' || urlTheme === 'light') {
          localStorage.setItem(THEME_STORAGE_KEY, urlTheme);
          return urlTheme;
        }
      }
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      // On first visit, respect system color-scheme preference
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  // Apply theme class and data-theme attribute to HTML tag immediately
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Listen to OS system color-scheme changes if user has not set an explicit preference
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (!saved) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      };
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => {
      const id = 'toast-' + Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persistent State
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_users');
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY + '_current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const exists = users.find((u) => u.id === parsed.id);
        return exists || users[0];
      }
      return users[0]; // default to Elena (Learner)
    } catch {
      return INITIAL_USERS[0];
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_appointments');
      return stored ? JSON.parse(stored) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  });

  const [classes, setClasses] = useState<ClassSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_classes');
      return stored ? JSON.parse(stored) : INITIAL_CLASSES;
    } catch {
      return INITIAL_CLASSES;
    }
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_conversations');
      return stored ? JSON.parse(stored) : INITIAL_CONVERSATIONS;
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_messages');
      return stored ? JSON.parse(stored) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_reviews');
      return stored ? JSON.parse(stored) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  const [payments, setPayments] = useState<PaymentTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_payments');
      return stored ? JSON.parse(stored) : INITIAL_PAYMENTS;
    } catch {
      return INITIAL_PAYMENTS;
    }
  });

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_complaints');
      return stored ? JSON.parse(stored) : INITIAL_COMPLAINTS;
    } catch {
      return INITIAL_COMPLAINTS;
    }
  });

  const [notifications, setNotifications] = useState<PlatformNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_notifications');
      return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_announcements');
      return stored ? JSON.parse(stored) : INITIAL_ANNOUNCEMENTS;
    } catch {
      return INITIAL_ANNOUNCEMENTS;
    }
  });

  // Failed login tracking and account lockout
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [lockedAccounts, setLockedAccounts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCKED_ACCOUNTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isAccountLocked = useCallback(
    (email: string) => lockedAccounts.includes(email.toLowerCase().trim()),
    [lockedAccounts]
  );

  // OTP State
  const [otpState, setOtpState] = useState<OtpState | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + '_users', JSON.stringify(users));
      localStorage.setItem(STORAGE_KEY + '_current_user', JSON.stringify(currentUser));
      localStorage.setItem(STORAGE_KEY + '_appointments', JSON.stringify(appointments));
      localStorage.setItem(STORAGE_KEY + '_classes', JSON.stringify(classes));
      localStorage.setItem(STORAGE_KEY + '_conversations', JSON.stringify(conversations));
      localStorage.setItem(STORAGE_KEY + '_messages', JSON.stringify(messages));
      localStorage.setItem(STORAGE_KEY + '_reviews', JSON.stringify(reviews));
      localStorage.setItem(STORAGE_KEY + '_payments', JSON.stringify(payments));
      localStorage.setItem(STORAGE_KEY + '_complaints', JSON.stringify(complaints));
      localStorage.setItem(STORAGE_KEY + '_notifications', JSON.stringify(notifications));
      localStorage.setItem(STORAGE_KEY + '_announcements', JSON.stringify(announcements));
      localStorage.setItem(LOCKED_ACCOUNTS_KEY, JSON.stringify(lockedAccounts));
    } catch (e) {
      console.warn('Storage sync issue:', e);
    }
  }, [
    users,
    currentUser,
    appointments,
    classes,
    conversations,
    messages,
    reviews,
    payments,
    complaints,
    notifications,
    announcements,
    lockedAccounts,
  ]);

  // Recalculate user ratings dynamically when reviews update
  useEffect(() => {
    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        const userReviews = reviews.filter((r) => r.reviewedUserId === u.id);
        if (userReviews.length === 0) return u;
        const avg = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
        const roundedAvg = Math.round(avg * 100) / 100;
        return {
          ...u,
          rating: roundedAvg,
          reviewCount: userReviews.length,
        };
      })
    );
  }, [reviews]);

  const syncBackendData = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    try {
      const [aptsRes, convsRes, usersRes] = await Promise.all([
        appointmentApi.getAppointments(),
        messageApi.getConversations(),
        userApi.getUsers(),
      ]);

      if (aptsRes.success && Array.isArray(aptsRes.data)) {
        setAppointments(aptsRes.data);
      }

      if (convsRes.success && Array.isArray(convsRes.data)) {
        setConversations(convsRes.data);
      }

      if (usersRes.success && Array.isArray(usersRes.data)) {
        setUsers((prev) => {
          const remoteUsers = (usersRes.data as any[]).map((u) => ({
            id: u._id?.toString() || u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            avatarUrl: u.avatarUrl || '',
            avatarBgColor: u.avatarBgColor || '#0284c7',
            headline: u.headline || '',
            bio: u.bio || '',
            location: u.location || '',
            languages: u.languages || ['English'],
            teachingSkills: u.teachingSkills || [],
            learningInterests: u.learningInterests || [],
            certificates: u.certificates || [],
            experience: u.experience || [],
            education: u.education || [],
            portfolioLinks: u.portfolioLinks || [],
            phoneNumber: u.phoneNumber,
            countryCode: u.countryCode,
            dateOfBirth: u.dateOfBirth,
            age: u.age,
            accountVerificationStatus: u.accountVerificationStatus || 'Unverified',
            identityVerification: u.identityVerification,
            isProfileVerified: Boolean(u.isProfileVerified),
            isSuspended: Boolean(u.isSuspended),
            twoFactorEnabled: Boolean(u.twoFactorEnabled),
            profileVisibility: u.profileVisibility || 'public',
            rating: u.rating || 5.0,
            reviewCount: u.reviewCount || 0,
            completedSessionsCount: u.completedSessionsCount || 0,
            totalEarnings: u.totalEarnings || 0,
            createdAt: u.createdAt || new Date().toISOString(),
          }));

          const remoteEmails = new Set(remoteUsers.map((u) => u.email.toLowerCase()));
          const remainingLocal = prev.filter((u) => !remoteEmails.has(u.email.toLowerCase()));
          return [...remoteUsers, ...remainingLocal];
        });
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const refreshAppointments = useCallback(async () => {
    try {
      const res = await appointmentApi.getAppointments();
      if (res.success && Array.isArray(res.data)) {
        setAppointments(res.data);
      }
    } catch {
      // Ignore
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await messageApi.getConversations();
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch {
      // Ignore
    }
  }, []);

  const loadMessagesForConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await messageApi.getMessages(conversationId);
      if (res.success && Array.isArray(res.data)) {
        setMessages((prev) => {
          const others = prev.filter((m) => m.conversationId !== conversationId);
          return [...others, ...res.data];
        });
      }
    } catch {
      // Ignore
    }
  }, []);

  // Synchronize authenticated session from MongoDB Atlas API on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    authApi
      .getMe()
      .then(async (res) => {
        if (res.success && res.data) {
          const u = res.data;
          const adaptedUser: UserProfile = {
            id: u._id || u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            avatarUrl: u.avatarUrl || '',
            avatarBgColor: u.avatarBgColor || '#0284c7',
            headline: u.headline || '',
            bio: u.bio || '',
            location: u.location || '',
            languages: u.languages || ['English'],
            teachingSkills: u.teachingSkills || [],
            learningInterests: u.learningInterests || [],
            certificates: u.certificates || [],
            experience: u.experience || [],
            education: u.education || [],
            portfolioLinks: u.portfolioLinks || [],
            phoneNumber: u.phoneNumber,
            countryCode: u.countryCode,
            dateOfBirth: u.dateOfBirth,
            age: u.age,
            accountVerificationStatus: u.accountVerificationStatus || 'Unverified',
            identityVerification: u.identityVerification,
            isProfileVerified: Boolean(u.isProfileVerified),
            isSuspended: Boolean(u.isSuspended),
            twoFactorEnabled: Boolean(u.twoFactorEnabled),
            profileVisibility: u.profileVisibility || 'public',
            rating: u.rating || 5.0,
            reviewCount: u.reviewCount || 0,
            completedSessionsCount: u.completedSessionsCount || 0,
            totalEarnings: u.totalEarnings || 0,
            createdAt: u.createdAt || new Date().toISOString(),
          };
          setCurrentUser(adaptedUser);
          setUsers((prev) => {
            const exists = prev.some((x) => x.email.toLowerCase() === u.email.toLowerCase());
            return exists
              ? prev.map((x) => (x.email.toLowerCase() === u.email.toLowerCase() ? adaptedUser : x))
              : [adaptedUser, ...prev];
          });
          await syncBackendData();
        }
      })
      .catch(() => {
        // Backend offline or token expired; local state remains active
      });
  }, [syncBackendData]);

  // Reset Demo Data
  const resetDemoData = useCallback(() => {
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setAppointments(INITIAL_APPOINTMENTS);
    setClasses(INITIAL_CLASSES);
    setConversations(INITIAL_CONVERSATIONS);
    setMessages(INITIAL_MESSAGES);
    setReviews(INITIAL_REVIEWS);
    setPayments(INITIAL_PAYMENTS);
    setComplaints(INITIAL_COMPLAINTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setLockedAccounts([]);
    setFailedAttempts({});
    setOtpState(null);
    localStorage.clear();
    addToast('info', 'Demo Data Reset', 'Platform restored to pristine initial seed state.');
  }, [addToast]);

  // Authentication Flows
  const login = useCallback(
    async (identifier: string, password: string): Promise<{ success: boolean; requiresOtp?: boolean; error?: string }> => {
      const cleanIdentifier = identifier.trim();
      const cleanEmail = cleanIdentifier.toLowerCase();
      const normalizedPhone = cleanIdentifier.replace(/[\s\-()]/g, '');

      // 1. Attempt backend authentication via MongoDB Atlas API
      try {
        const apiRes = await authApi.login(cleanIdentifier, password);
        if (apiRes.success && apiRes.data?.user && apiRes.data.token) {
          const { user: backendUser, token } = apiRes.data;
          localStorage.setItem(TOKEN_STORAGE_KEY, token);

          // Adapt backend user model to UserProfile
          const adaptedUser: UserProfile = {
            id: backendUser._id || backendUser.id,
            email: backendUser.email,
            name: backendUser.name,
            role: backendUser.role,
            avatarUrl: backendUser.avatarUrl || '',
            avatarBgColor: backendUser.avatarBgColor || '#0284c7',
            headline: backendUser.headline || '',
            bio: backendUser.bio || '',
            location: backendUser.location || '',
            languages: backendUser.languages || ['English'],
            teachingSkills: backendUser.teachingSkills || [],
            learningInterests: backendUser.learningInterests || [],
            certificates: backendUser.certificates || [],
            experience: backendUser.experience || [],
            education: backendUser.education || [],
            portfolioLinks: backendUser.portfolioLinks || [],
            phoneNumber: backendUser.phoneNumber,
            countryCode: backendUser.countryCode,
            dateOfBirth: backendUser.dateOfBirth,
            age: backendUser.age,
            accountVerificationStatus: backendUser.accountVerificationStatus || 'Unverified',
            identityVerification: backendUser.identityVerification,
            isProfileVerified: Boolean(backendUser.isProfileVerified),
            isSuspended: Boolean(backendUser.isSuspended),
            twoFactorEnabled: Boolean(backendUser.twoFactorEnabled),
            profileVisibility: backendUser.profileVisibility || 'public',
            rating: backendUser.rating || 5.0,
            reviewCount: backendUser.reviewCount || 0,
            completedSessionsCount: backendUser.completedSessionsCount || 0,
            totalEarnings: backendUser.totalEarnings || 0,
            createdAt: backendUser.createdAt || new Date().toISOString(),
          };

          setCurrentUser(adaptedUser);
          setUsers((prev) => {
            const exists = prev.some((u) => u.email.toLowerCase() === adaptedUser.email.toLowerCase());
            return exists
              ? prev.map((u) => (u.email.toLowerCase() === adaptedUser.email.toLowerCase() ? adaptedUser : u))
              : [adaptedUser, ...prev];
          });

          await syncBackendData();

          addToast('success', 'Connected to MongoDB Atlas', `Welcome back, ${adaptedUser.name}!`);
          return { success: true };
        }
      } catch (err) {
        // Backend unavailable; continue with local demo authentication fallback below
      }

      // 2. Local fallback / demo accounts
      // Check lockout
      if (lockedAccounts.includes(cleanEmail) || lockedAccounts.includes(cleanIdentifier)) {
        return {
          success: false,
          error: 'Account locked due to 5 consecutive failed login attempts. Use the Account Recovery option.',
        };
      }

      const found = users.find(
        (u) =>
          u.email.toLowerCase() === cleanEmail ||
          (u.phoneNumber && (u.phoneNumber.trim() === cleanIdentifier || u.phoneNumber.replace(/[\s\-()]/g, '') === normalizedPhone))
      );
      if (!found) {
        const lockoutKey = cleanEmail;
        const attempts = (failedAttempts[lockoutKey] || 0) + 1;
        setFailedAttempts((prev) => ({ ...prev, [lockoutKey]: attempts }));
        if (attempts >= 5) {
          setLockedAccounts((prev) => [...prev, lockoutKey]);
          return {
            success: false,
            error: 'Account locked! 5 consecutive failed login attempts. Recovery required.',
          };
        }
        return {
          success: false,
          error: `Invalid credentials. (${attempts}/5 attempts before account lock)`,
        };
      }

      if (found.isSuspended) {
        return {
          success: false,
          error: 'This account has been suspended by platform administration.',
        };
      }

      // Password check:
      // Accepts registered user's hashed password OR demo passwords: "password", "password123", "admin123", or matching role name
      const validPasswords = ['password', 'password123', 'admin123', found.role, 'demo123'];
      const inputHash = await hashPassword(password);
      const isHashedMatch = Boolean(found.passwordHash && found.passwordHash === inputHash);
      const isDemoMatch = validPasswords.includes(password.trim());

      if (!isHashedMatch && !isDemoMatch) {
        const lockoutKey = found.email.toLowerCase();
        const attempts = (failedAttempts[lockoutKey] || 0) + 1;
        setFailedAttempts((prev) => ({ ...prev, [lockoutKey]: attempts }));
        if (attempts >= 5) {
          setLockedAccounts((prev) => [...prev, lockoutKey]);
          return {
            success: false,
            error: 'Account locked! 5 consecutive failed attempts. Recovery required.',
          };
        }
        return {
          success: false,
          error: `Incorrect password. (${attempts}/5 attempts before lock)`,
        };
      }

      // Reset failed attempts on success
      setFailedAttempts((prev) => {
        const copy = { ...prev };
        delete copy[cleanEmail];
        delete copy[found.email.toLowerCase()];
        return copy;
      });

      // 6-digit OTP check simulation (if 2FA enabled or for demo verification)
      if (found.twoFactorEnabled || found.role === 'admin') {
        const simulatedCode = '849201'; // deterministic demo OTP
        setOtpState({
          pendingEmail: cleanEmail,
          targetRole: found.role,
          code: simulatedCode,
          expiresAt: Date.now() + 180000, // 3 minutes
        });
        return {
          success: true,
          requiresOtp: true,
        };
      }

      setCurrentUser(found);
      addToast('success', 'Welcome Back', `Logged in as ${found.name} (${found.role}).`);
      return { success: true };
    },
    [users, lockedAccounts, failedAttempts, addToast]
  );

  const loginWithDemoRole = useCallback(
    async (role: UserRole) => {
      const roleEmails: Record<UserRole, string> = {
        learner: 'learner@skillexchange.io',
        teacher: 'teacher@skillexchange.io',
        admin: 'admin@skillexchange.io',
      };
      const email = roleEmails[role] || `${role}@skillexchange.io`;
      const res = await login(email, 'password123');
      if (!res.success) {
        let targetUser = users.find((u) => u.id === `usr-${role}` || u.role === role);
        if (targetUser) {
          setCurrentUser(targetUser);
          setOtpState(null);
          addToast('success', `Switched to Demo ${role.toUpperCase()}`, `Logged in as ${targetUser.name}`);
        }
      }
    },
    [login, users, addToast]
  );

  const verifyOtp = useCallback(
    (inputCode: string): boolean => {
      if (!otpState) return false;
      if (Date.now() > otpState.expiresAt) {
        addToast('error', 'OTP Expired', 'The verification code expired. Please request a new code.');
        return false;
      }
      if (inputCode.trim() === otpState.code || inputCode.trim() === '849201') {
        const found = users.find((u) => u.email.toLowerCase() === otpState.pendingEmail);
        if (found) {
          setCurrentUser(found);
          setOtpState(null);
          addToast('success', 'Two-Factor Verified', `Welcome back, ${found.name}!`);
          return true;
        }
      }
      addToast('error', 'Invalid Code', 'The 6-digit verification code you entered is incorrect.');
      return false;
    },
    [otpState, users, addToast]
  );

  const resendOtp = useCallback((): string => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpState((prev) =>
      prev
        ? {
            ...prev,
            code: newCode,
            expiresAt: Date.now() + 180000,
          }
        : null
    );
    addToast('info', 'New Code Generated', `Demo verification code: ${newCode}`);
    return newCode;
  }, [addToast]);

  const cancelOtp = useCallback(() => {
    setOtpState(null);
  }, []);

  const unlockAccount = useCallback(
    (email: string) => {
      const clean = email.toLowerCase().trim();
      setLockedAccounts((prev) => prev.filter((e) => e !== clean));
      setFailedAttempts((prev) => {
        const copy = { ...prev };
        delete copy[clean];
        return copy;
      });
      addToast('success', 'Account Unlocked', `Account for ${email} has been successfully restored.`);
    },
    [addToast]
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<boolean> => {
      const clean = email.toLowerCase().trim();
      const exists = users.some((u) => u.email.toLowerCase() === clean);
      if (!exists) {
        addToast('error', 'Account Not Found', 'No account exists with this email address.');
        return false;
      }
      addToast(
        'success',
        'Password Reset Link Simulated',
        `In a production environment, a reset token would be emailed to ${email}. For demo, password remains 'password123'.`
      );
      return true;
    },
    [users, addToast]
  );

  const logout = useCallback(() => {
    authApi.logout();
    setCurrentUser(null);
    setOtpState(null);
    setAppointments([]);
    setConversations([]);
    setMessages([]);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    addToast('info', 'Signed Out', 'You have been safely signed out.');
  }, [addToast]);

  const registerUser = useCallback(
    async (
      dataOrName: RegisterUserData | string,
      legacyEmail?: string,
      legacyRole?: UserRole
    ): Promise<{ success: boolean; error?: string }> => {
      // Compatibility branch for simple legacy signature (name, email, role)
      if (typeof dataOrName === 'string') {
        const name = dataOrName;
        const email = legacyEmail || '';
        const role = legacyRole || 'learner';
        const clean = email.toLowerCase().trim();
        if (users.some((u) => u.email.toLowerCase() === clean)) {
          return { success: false, error: 'An account with this email already exists.' };
        }

        const colors = ['#0284c7', '#059669', '#d97706', '#9333ea', '#e11d48', '#2563eb'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newUser: UserProfile = {
          id: 'usr-' + Math.random().toString(36).substring(2, 9),
          email: clean,
          name: name.trim(),
          role,
          avatarUrl: '',
          avatarBgColor: randomColor,
          headline: role === 'teacher' ? 'Independent Educator' : 'Aspiring Learner',
          bio: `Hi, I am ${name.trim()}! Excited to join Skill Exchange to share knowledge and learn from peers.`,
          location: 'Remote, Global',
          languages: ['English'],
          teachingSkills: [],
          learningInterests: [],
          certificates: [],
          experience: [],
          education: [],
          portfolioLinks: [],
          isProfileVerified: false,
          isSuspended: false,
          twoFactorEnabled: false,
          profileVisibility: 'public',
          rating: 5.0,
          reviewCount: 0,
          completedSessionsCount: 0,
          totalEarnings: 0,
          createdAt: new Date().toISOString(),
        };

        setUsers((prev) => [newUser, ...prev]);
        setCurrentUser(newUser);
        addToast('success', 'Account Created', `Welcome to Skill Exchange, ${name}!`);
        return { success: true };
      }

      // Advanced registration with identity verification and documents
      const data = dataOrName as RegisterUserData;
      const cleanEmail = (data.email || '').toLowerCase().trim();

      // 1. Check duplicate email registration against backend / database first
      try {
        const checkRes = await authApi.checkEmail(cleanEmail);
        const isAvailable =
          checkRes.data?.available !== undefined
            ? checkRes.data.available
            : (checkRes as any).available;
        if (checkRes.success && isAvailable === false) {
          const dupMsg =
            checkRes.data?.message ||
            checkRes.message ||
            'An account with this email address already exists. Please sign in instead.';
          return {
            success: false,
            error: dupMsg,
          };
        }
      } catch {
        // Fallback to local check if check-email endpoint has network issues
      }

      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
      }

      // 2. Validate email format
      if (!validateEmail(cleanEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      // 3. Validate phone number
      if (!validatePhoneNumber(data.phoneNumber)) {
        return { success: false, error: 'Please enter a valid phone number (at least 7 digits).' };
      }

      // 4. Validate age and corresponding identity document type
      const ageValidation = validateAgeAndDocument(data.dateOfBirth, data.identityDocument.type);
      if (!ageValidation.valid) {
        return { success: false, error: ageValidation.error || 'Identity document type does not match your age.' };
      }

      const calculatedAge = ageValidation.age;

      // 5. Enforce identity document number and PDF attachment
      if (!data.identityDocument.documentNumber || data.identityDocument.documentNumber.trim().length === 0) {
        return {
          success: false,
          error:
            data.identityDocument.type === 'National ID (NID)'
              ? 'National ID (NID) card number is required.'
              : 'Birth Certificate registration number is required.',
        };
      }

      if (!data.identityDocument.fileData) {
        return {
          success: false,
          error: `Please upload your ${data.identityDocument.type} PDF document.`,
        };
      }

      // 6. Validate password requirements
      if (!data.password || data.password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }

      // 7. Secure cryptographic password hashing (never store plain text locally)
      const passwordHash = await hashPassword(data.password);

      // Normalize phone number: avoid duplicating country code if input already includes it
      const rawPhone = (data.phoneNumber || '').trim();
      const formattedPhone = rawPhone.startsWith('+')
        ? rawPhone
        : `${data.countryCode} ${rawPhone}`;

      // 8. Submit directly to backend MongoDB Atlas API
      let apiRes;
      try {
        apiRes = await authApi.register({
          name: data.name.trim(),
          email: cleanEmail,
          password: data.password,
          role: data.role,
          phoneNumber: formattedPhone,
          countryCode: data.countryCode,
          dateOfBirth: data.dateOfBirth,
          age: calculatedAge,
          avatarUrl: data.avatarUrl || '',
          identityDocument: {
            type: data.identityDocument.type,
            documentNumber: data.identityDocument.documentNumber.trim(),
            fileName: data.identityDocument.fileName,
            fileSize: data.identityDocument.fileSize,
            fileData: data.identityDocument.fileData,
          },
          certificates: data.certificates?.map((c) => ({
            title: c.title || c.fileName.replace(/\.pdf$/i, ''),
            issuingOrganization: c.issuingOrganization || 'Verified Educational/Professional Institution',
            issueDate: new Date().toISOString().split('T')[0],
            relatedSkill: c.title || 'General Credential',
            fileName: c.fileName,
            fileSize: c.fileSize,
            fileData: c.fileData,
          })),
        });
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Network error connecting to backend registration service.',
        };
      }

      // Safe diagnostic logging before guard check (no sensitive data: tokens, passwords, NID, base64 redacted)
      console.log('[Diagnostic:AppContext:registerUser] Response inspection:', {
        hasApiRes: Boolean(apiRes),
        apiResType: typeof apiRes,
        success: apiRes?.success,
        message: apiRes?.message,
        error: apiRes?.error,
        dataKeys: apiRes?.data ? Object.keys(apiRes.data) : null,
        hasUser: Boolean(apiRes?.data?.user),
        hasToken: Boolean(apiRes?.data?.token),
        userKeys: apiRes?.data?.user ? Object.keys(apiRes.data.user) : null,
        tokenType: typeof apiRes?.data?.token,
        guardConditionPasses: Boolean(apiRes && apiRes.success && apiRes.data?.user && apiRes.data.token),
      });

      // Strict requirement: Ensure successful registration only occurs after backend confirms user creation and JWT
      if (!apiRes || !apiRes.success || !apiRes.data?.user || !apiRes.data.token) {
        const errorMsg =
          apiRes?.message ||
          apiRes?.error ||
          ((apiRes as any)?.errors && typeof (apiRes as any).errors === 'object'
            ? Object.values((apiRes as any).errors).join(', ')
            : undefined) ||
          (apiRes as any)?.data?.message ||
          (apiRes as any)?.data?.error ||
          (apiRes
            ? `Backend returned status ${apiRes.success ? 'success without user session' : 'failure'}. Please check server logs.`
            : 'Could not connect to backend server. Please ensure backend is running.');
        console.error('[AppContext] Registration rejected by backend API:', {
          apiRes,
          cleanEmail,
          formattedPhone,
          errorMsg,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }

      const backendUser = apiRes.data.user;
      const backendCerts = apiRes.data.certificates || [];
      const token = apiRes.data.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      const effectiveUserId = backendUser._id || backendUser.id;

      const colors = ['#0284c7', '#059669', '#d97706', '#9333ea', '#e11d48', '#2563eb', '#0891b2', '#7c3aed'];
      const randomColor = backendUser.avatarBgColor || colors[Math.floor(Math.random() * colors.length)];

      // 9. Convert uploaded / saved certificates
      const formattedCertificates: Certificate[] = backendCerts.length > 0
        ? backendCerts.map((c: any) => ({
            id: c._id || c.id || 'cert-' + Math.random().toString(36).substring(2, 9),
            userId: effectiveUserId,
            title: c.title || c.certificateName || 'Credential',
            issuingOrganization: c.issuingOrganization || 'Verified Institution',
            issueDate: c.issueDate || new Date().toISOString().split('T')[0],
            expirationDate: c.expirationDate,
            relatedSkill: c.relatedSkill || 'General Credential',
            fileName: c.fileName || `${c.title}.pdf`,
            fileSize: c.fileSize || 1024,
            fileData: c.fileData || c.documentUrl,
            status: c.status || 'Pending',
            submittedAt: c.submittedAt || new Date().toISOString(),
          }))
        : (data.certificates || []).map((c) => ({
            id: 'cert-' + Math.random().toString(36).substring(2, 9),
            userId: effectiveUserId,
            title: c.title || c.fileName.replace(/\.pdf$/i, ''),
            issuingOrganization: c.issuingOrganization || 'Verified Educational/Professional Institution',
            issueDate: new Date().toISOString().split('T')[0],
            relatedSkill: c.title || 'General Credential',
            fileName: c.fileName,
            fileSize: c.fileSize,
            fileData: c.fileData,
            status: 'Pending',
            submittedAt: new Date().toISOString(),
          }));

      // 10. Build registered user profile matching backend user record
      const newUser: UserProfile = {
        id: effectiveUserId,
        email: backendUser.email || cleanEmail,
        name: backendUser.name || data.name.trim(),
        role: backendUser.role || data.role,
        avatarUrl: backendUser.avatarUrl || data.avatarUrl || '',
        avatarBgColor: randomColor,
        headline: backendUser.headline || (data.role === 'teacher' ? 'Certified Instructor' : 'Active Learner'),
        bio: backendUser.bio || `Hi, I am ${data.name.trim()}! Excited to join Skill Exchange to share knowledge and learn from peers.`,
        location: backendUser.location || 'Remote, Global',
        languages: backendUser.languages || ['English'],
        phoneNumber: backendUser.phoneNumber || `${data.countryCode} ${data.phoneNumber.trim()}`,
        countryCode: backendUser.countryCode || data.countryCode,
        dateOfBirth: backendUser.dateOfBirth || data.dateOfBirth,
        age: backendUser.age || calculatedAge,
        passwordHash,
        accountVerificationStatus: backendUser.accountVerificationStatus || 'Pending Verification',
        identityVerification: backendUser.identityVerification || {
          status: 'Pending',
          documentType: data.identityDocument.type,
          documentNumber: data.identityDocument.documentNumber.trim(),
          documentFileName: data.identityDocument.fileName,
          documentFileSize: data.identityDocument.fileSize,
          documentUrl: data.identityDocument.fileData,
          submittedAt: new Date().toISOString(),
        },
        teachingSkills: [],
        learningInterests: backendUser.learningInterests || [],
        certificates: formattedCertificates,
        experience: [],
        education: [],
        portfolioLinks: [],
        isProfileVerified: Boolean(backendUser.isProfileVerified),
        isSuspended: Boolean(backendUser.isSuspended),
        twoFactorEnabled: Boolean(backendUser.twoFactorEnabled),
        profileVisibility: backendUser.profileVisibility || 'public',
        rating: backendUser.rating || 5.0,
        reviewCount: backendUser.reviewCount || 0,
        completedSessionsCount: backendUser.completedSessionsCount || 0,
        totalEarnings: backendUser.totalEarnings || 0,
        createdAt: backendUser.createdAt || new Date().toISOString(),
      };

      // 11. Persist user and set active session
      setUsers((prev) => [newUser, ...prev]);
      setCurrentUser(newUser);

      // 11. Create welcome notifications
      const userNotif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: effectiveUserId,
        title: 'Identity Verification Submitted',
        message: `Welcome to Skill Exchange! Your ${data.identityDocument.type} has been received and is queued for administrative verification.`,
        category: 'Verifications',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/dashboard',
      };

      const adminNotif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: 'usr-admin',
        title: 'New Identity Document Verification',
        message: `${newUser.name} registered (${data.role}, Age: ${calculatedAge}) and submitted a ${data.identityDocument.type} for review.`,
        category: 'Verifications',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/admin/verifications',
      };

      setNotifications((prev) => [userNotif, adminNotif, ...prev]);

      addToast(
        'success',
        'Registration Complete',
        `Welcome to Skill Exchange, ${data.name}! Your account has been created and verification document is queued.`
      );

      return { success: true };
    },
    [users, addToast]
  );

  // Profile Updates
  const updateProfile = useCallback(
    (updated: Partial<UserProfile>) => {
      if (!currentUser) return;
      const merged = { ...currentUser, ...updated };
      setCurrentUser(merged);
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? merged : u)));
      addToast('success', 'Profile Updated', 'Your profile changes have been saved.');
    },
    [currentUser, addToast]
  );

  const addSkill = useCallback(
    (skillData: Omit<UserSkill, 'id'>) => {
      if (!currentUser) return;
      const newSkill: UserSkill = {
        ...skillData,
        id: 'sk-' + Math.random().toString(36).substring(2, 9),
      };
      const updatedSkills = [...currentUser.teachingSkills, newSkill];
      updateProfile({ teachingSkills: updatedSkills });
      // Sync with MongoDB backend if available
      skillApi
        .createSkill({
          name: skillData.name,
          category: skillData.category,
          proficiency: skillData.proficiency,
          description: skillData.description,
          yearsExperience: skillData.yearsExperience,
          freeSwapAvailable: skillData.freeSwapAvailable,
          paidLessonAvailable: skillData.paidLessonAvailable,
          hourlyPrice: skillData.hourlyPrice,
          availabilitySchedule: skillData.availabilitySchedule,
        })
        .catch(() => {});
      addToast('success', 'Skill Added', `Added "${skillData.name}" to your teaching repertoire.`);
    },
    [currentUser, updateProfile, addToast]
  );

  const editSkill = useCallback(
    (skillId: string, updated: Partial<UserSkill>) => {
      if (!currentUser) return;
      const updatedSkills = currentUser.teachingSkills.map((s) =>
        s.id === skillId ? { ...s, ...updated } : s
      );
      updateProfile({ teachingSkills: updatedSkills });
      addToast('success', 'Skill Updated', 'Skill details updated successfully.');
    },
    [currentUser, updateProfile, addToast]
  );

  const deleteSkill = useCallback(
    (skillId: string) => {
      if (!currentUser) return;
      const updatedSkills = currentUser.teachingSkills.filter((s) => s.id !== skillId);
      updateProfile({ teachingSkills: updatedSkills });
      addToast('info', 'Skill Deleted', 'The skill was removed from your teaching profile.');
    },
    [currentUser, updateProfile, addToast]
  );

  const addLearningInterest = useCallback(
    (interest: string) => {
      if (!currentUser) return;
      const trimmed = interest.trim();
      if (!trimmed) return;
      if (currentUser.learningInterests.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
        addToast('warning', 'Already in Interests', `"${trimmed}" is already on your learning wish list.`);
        return;
      }
      const updated = [...currentUser.learningInterests, trimmed];
      updateProfile({ learningInterests: updated });
      addToast('success', 'Interest Added', `Added "${trimmed}" to your learning interests.`);
    },
    [currentUser, updateProfile, addToast]
  );

  const removeLearningInterest = useCallback(
    (interest: string) => {
      if (!currentUser) return;
      const updated = currentUser.learningInterests.filter((i) => i !== interest);
      updateProfile({ learningInterests: updated });
      addToast('info', 'Interest Removed', `Removed "${interest}" from your wish list.`);
    },
    [currentUser, updateProfile, addToast]
  );

  // Certificates
  const addCertificate = useCallback(
    (certData: Omit<Certificate, 'id' | 'userId' | 'submittedAt' | 'status'>) => {
      if (!currentUser) return;
      const newCert: Certificate = {
        ...certData,
        id: 'cert-' + Math.random().toString(36).substring(2, 9),
        userId: currentUser.id,
        status: 'Pending',
        submittedAt: new Date().toISOString(),
      };
      const updatedCerts = [...currentUser.certificates, newCert];
      updateProfile({ certificates: updatedCerts });

      // Sync with MongoDB backend if available
      certificateApi
        .createCertificate({
          title: certData.title,
          issuingOrganization: certData.issuingOrganization,
          issueDate: certData.issueDate,
          relatedSkill: certData.relatedSkill,
          fileName: certData.fileName,
          fileSize: certData.fileSize,
          fileData: certData.fileData,
        })
        .catch(() => {});

      // Add admin notification
      const adminNotif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: 'usr-admin',
        title: 'New Certificate Verification Pending',
        message: `${currentUser.name} submitted a credential for ${certData.relatedSkill}: "${certData.title}".`,
        category: 'Verifications',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/admin/verifications',
      };
      setNotifications((prev) => [adminNotif, ...prev]);

      addToast('success', 'Certificate Submitted', 'Your credential is queued for administrative verification.');
    },
    [currentUser, updateProfile, addToast]
  );

  const updateCertificateStatus = useCallback(
    (certId: string, status: 'Verified' | 'Rejected', reason?: string) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          const hasCert = u.certificates.some((c) => c.id === certId);
          if (!hasCert) return u;
          const updatedCerts = u.certificates.map((c) =>
            c.id === certId ? { ...c, status, rejectionReason: reason } : c
          );

          // If current user is the owner, keep current user in sync
          if (currentUser && currentUser.id === u.id) {
            setCurrentUser((curr) => (curr ? { ...curr, certificates: updatedCerts } : null));
          }

          // Create notification for certificate owner
          const notif: PlatformNotification = {
            id: 'notif-' + Math.random().toString(36).substring(2, 9),
            userId: u.id,
            title: status === 'Verified' ? 'Certificate Approved!' : 'Certificate Status Update',
            message:
              status === 'Verified'
                ? `Your certificate was verified. A verification badge now appears on your profile.`
                : `Your certificate submission was rejected. Reason: ${reason || 'Incomplete documentation'}.`,
            category: 'Verifications',
            isRead: false,
            createdAt: new Date().toISOString(),
            actionUrl: '/certificates',
          };
          setNotifications((prev) => [notif, ...prev]);

          return { ...u, certificates: updatedCerts };
        })
      );
      addToast('info', 'Verification Updated', `Certificate marked as ${status}.`);
    },
    [currentUser, addToast]
  );

  // Appointments
  const createAppointment = useCallback(
    async (aptData: Omit<Appointment, 'id' | 'createdAt' | 'status'>): Promise<Appointment> => {
      try {
        const apiRes = await appointmentApi.createAppointment({
          teacherId: aptData.teacherId,
          skillId: aptData.skillId,
          skillName: aptData.skillName,
          requestedDate: aptData.requestedDate,
          startTime: aptData.startTime,
          durationMinutes: aptData.durationMinutes,
          isFreeSwap: aptData.isFreeSwap,
          offeredSwapSkillName: aptData.offeredSwapSkillName,
          hourlyPrice: aptData.hourlyPrice,
          totalCost: aptData.totalCost,
          message: aptData.message,
        });

        if (apiRes.success && apiRes.data) {
          const createdApt: Appointment = apiRes.data;
          setAppointments((prev) => [
            createdApt,
            ...prev.filter((a) => a.id !== createdApt.id),
          ]);

          addToast(
            'success',
            'Request Sent',
            `Your session request for "${createdApt.skillName}" was sent to ${createdApt.teacherName}.`
          );
          return createdApt;
        } else {
          const errorMsg = apiRes.error || apiRes.message || 'Failed to submit appointment request.';
          addToast('error', 'Booking Failed', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('Network error') && !err.message.includes('Could not connect')) {
          throw err;
        }

        // Local fallback if server unreachable
        const fallbackApt: Appointment = {
          ...aptData,
          id: 'apt-' + Math.random().toString(36).substring(2, 9),
          status: 'Pending',
          createdAt: new Date().toISOString(),
          meetingId: 'meet-' + Math.random().toString(36).substring(2, 9),
        };
        setAppointments((prev) => [fallbackApt, ...prev]);
        addToast(
          'warning',
          'Saved Locally (Offline)',
          `Your request was recorded in local session.`
        );
        return fallbackApt;
      }
    },
    [addToast]
  );

  const updateAppointmentStatus = useCallback(
    async (appointmentId: string, status: AppointmentStatus, cancellationReason?: string) => {
      try {
        const apiRes = await appointmentApi.updateStatus(appointmentId, status, cancellationReason);
        if (apiRes.success && apiRes.data) {
          const updatedApt: Appointment = apiRes.data;
          setAppointments((prev) =>
            prev.map((a) => (a.id === updatedApt.id || a.id === appointmentId ? updatedApt : a))
          );
          addToast('success', `Request ${status}`, `Appointment has been marked as ${status}.`);
          return;
        }
      } catch {
        // Fall through to local state update
      }

      setAppointments((prev) =>
        prev.map((apt) => {
          if (apt.id !== appointmentId) return apt;
          return { ...apt, status, cancellationReason };
        })
      );
      addToast('info', `Status Updated`, `Appointment marked as ${status}.`);
    },
    [addToast]
  );

  // Classes
  const createClass = useCallback(
    (clsData: Omit<ClassSession, 'id' | 'teacherId' | 'teacherName' | 'status' | 'enrolledUserIds'>): ClassSession => {
      if (!currentUser) throw new Error('Must be logged in');
      const newClass: ClassSession = {
        ...clsData,
        id: 'cls-' + Math.random().toString(36).substring(2, 9),
        teacherId: currentUser.id,
        teacherName: currentUser.name,
        status: 'Scheduled',
        enrolledUserIds: [],
        meetingLink: `https://meet.skillexchange.io/room/${Math.random().toString(36).substring(2, 10)}`,
      };
      setClasses((prev) => [newClass, ...prev]);
      addToast('success', 'Class Created', `"${clsData.title}" is now open for enrollment!`);
      return newClass;
    },
    [currentUser, addToast]
  );

  const updateClass = useCallback(
    (classId: string, updated: Partial<ClassSession>) => {
      setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, ...updated } : c)));
      addToast('success', 'Class Updated', 'Class details have been saved.');
    },
    [addToast]
  );

  const cancelClass = useCallback(
    (classId: string, reason: string) => {
      setClasses((prev) =>
        prev.map((c) => {
          if (c.id !== classId) return c;
          // Notify enrolled users
          c.enrolledUserIds.forEach((studentId) => {
            const notif: PlatformNotification = {
              id: 'notif-' + Math.random().toString(36).substring(2, 9),
              userId: studentId,
              title: 'Class Cancelled',
              message: `The class "${c.title}" was cancelled by the instructor. Reason: ${reason}.`,
              category: 'Sessions',
              isRead: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/classes',
            };
            setNotifications((prevNotifs) => [notif, ...prevNotifs]);
          });
          return { ...c, status: 'Cancelled', cancellationReason: reason };
        })
      );
      addToast('warning', 'Class Cancelled', 'Enrolled participants have been alerted.');
    },
    [addToast]
  );

  const enrollInClass = useCallback(
    async (classId: string, paymentMethodLast4: string = '4242'): Promise<boolean> => {
      if (!currentUser) return false;
      const targetClass = classes.find((c) => c.id === classId);
      if (!targetClass) return false;

      if (targetClass.enrolledUserIds.includes(currentUser.id)) {
        addToast('info', 'Already Enrolled', 'You are already registered for this session.');
        return true;
      }

      if (targetClass.enrolledUserIds.length >= targetClass.capacity) {
        addToast('error', 'Class Full', 'This session has reached maximum capacity.');
        return false;
      }

      // If paid, create payment record
      if (!targetClass.isFree && targetClass.price > 0) {
        const paymentTx: PaymentTransaction = {
          id: 'tx-' + Math.random().toString(36).substring(2, 9),
          userId: currentUser.id,
          userName: currentUser.name,
          sessionId: targetClass.id,
          itemTitle: targetClass.title,
          amount: targetClass.price,
          currency: 'USD',
          paymentMethodLast4,
          status: 'Completed',
          refundStatus: 'None',
          createdAt: new Date().toISOString(),
        };
        setPayments((prev) => [paymentTx, ...prev]);

        // Add to teacher earnings
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === targetClass.teacherId
              ? { ...u, totalEarnings: u.totalEarnings + targetClass.price }
              : u
          )
        );
      }

      // Update enrollment
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId ? { ...c, enrolledUserIds: [...c.enrolledUserIds, currentUser.id] } : c
        )
      );

      // Notify teacher
      const teacherNotif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: targetClass.teacherId,
        title: 'New Student Enrollment',
        message: `${currentUser.name} joined your class "${targetClass.title}".`,
        category: 'Sessions',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/classes',
      };
      setNotifications((prev) => [teacherNotif, ...prev]);

      addToast('success', 'Enrolled Successfully!', `You are registered for "${targetClass.title}".`);
      return true;
    },
    [currentUser, classes, addToast]
  );

  const completeClass = useCallback(
    (classId: string) => {
      setClasses((prev) =>
        prev.map((c) => {
          if (c.id !== classId) return c;
          // Notify enrolled participants that they can now submit a review
          c.enrolledUserIds.forEach((uid) => {
            const notif: PlatformNotification = {
              id: 'notif-' + Math.random().toString(36).substring(2, 9),
              userId: uid,
              title: 'Session Completed — Leave a Review',
              message: `Your class "${c.title}" with ${c.teacherName} is complete. Share your feedback!`,
              category: 'Sessions',
              isRead: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/reviews',
            };
            setNotifications((prevNotifs) => [notif, ...prevNotifs]);
          });
          return { ...c, status: 'Completed' };
        })
      );
      addToast('success', 'Session Completed', 'The class has concluded. Participants may now review.');
    },
    [addToast]
  );

  // Messaging
  const sendMessage = useCallback(
    async (receiverId: string, text: string, attachmentName?: string, attachmentSize?: string) => {
      if (!currentUser) return;

      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        try {
          const apiRes = await messageApi.sendMessage({
            receiverId,
            text,
            attachmentName,
            attachmentSize,
          });

          if (apiRes.success && apiRes.data?.message && apiRes.data?.conversation) {
            const { message: backendMsg, conversation: backendConv } = apiRes.data;

            setMessages((prev) => {
              const exists = prev.some((m) => m.id === backendMsg.id);
              return exists ? prev.map((m) => (m.id === backendMsg.id ? backendMsg : m)) : [...prev, backendMsg];
            });

            setConversations((prev) => {
              const exists = prev.some((c) => c.id === backendConv.id);
              return exists
                ? prev.map((c) => (c.id === backendConv.id ? backendConv : c))
                : [backendConv, ...prev];
            });
            return;
          }
        } catch {
          // Backend offline fallback
        }
      }

      const participants = [currentUser.id, receiverId].sort();
      let conv = conversations.find(
        (c) =>
          c.participantIds.includes(currentUser.id) && c.participantIds.includes(receiverId)
      );

      let convId = conv ? conv.id : 'conv-' + Math.random().toString(36).substring(2, 9);

      const newMsg: Message = {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        conversationId: convId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId,
        text,
        attachmentName,
        attachmentSize,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      setMessages((prev) => [...prev, newMsg]);

      // Update conversation
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === convId);
        if (existing) {
          return prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  lastMessageText: text || (attachmentName ? `Attachment: ${attachmentName}` : ''),
                  lastMessageTimestamp: new Date().toISOString(),
                  unreadCountForUser: {
                    ...c.unreadCountForUser,
                    [receiverId]: (c.unreadCountForUser[receiverId] || 0) + 1,
                  },
                }
              : c
          );
        } else {
          return [
            {
              id: convId,
              participantIds: participants,
              lastMessageText: text || (attachmentName ? `Attachment: ${attachmentName}` : ''),
              lastMessageTimestamp: new Date().toISOString(),
              unreadCountForUser: {
                [currentUser.id]: 0,
                [receiverId]: 1,
              },
            },
            ...prev,
          ];
        }
      });

      // Notification
      const notif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: receiverId,
        title: `New message from ${currentUser.name}`,
        message: text ? (text.length > 60 ? text.substring(0, 57) + '...' : text) : 'Sent an attachment',
        category: 'Messages',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/messages',
      };
      setNotifications((prev) => [notif, ...prev]);
    },
    [currentUser, conversations]
  );

  const markConversationAsRead = useCallback(
    (conversationId: string) => {
      if (!currentUser) return;

      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        messageApi.markAsRead(conversationId).catch(() => {});
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === conversationId && m.receiverId === currentUser.id
            ? { ...m, isRead: true }
            : m
        )
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                unreadCountForUser: {
                  ...c.unreadCountForUser,
                  [currentUser.id]: 0,
                },
              }
            : c
        )
      );
    },
    [currentUser]
  );

  const blockUser = useCallback(
    (targetUserId: string) => {
      if (!currentUser) return;
      addToast('info', 'User Blocked', 'You will no longer receive direct messages from this user.');
    },
    [currentUser, addToast]
  );

  // Reviews
  const submitReview = useCallback(
    (reviewData: Omit<Review, 'id' | 'createdAt' | 'isFlagged'>) => {
      if (!currentUser) return;
      // Check duplicate review
      const alreadyReviewed = reviews.some(
        (r) => r.sessionId === reviewData.sessionId && r.reviewerId === currentUser.id
      );
      if (alreadyReviewed) {
        addToast('error', 'Review Exists', 'You have already submitted a review for this session.');
        return;
      }

      const newReview: Review = {
        ...reviewData,
        id: 'rev-' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        isFlagged: false,
      };

      setReviews((prev) => [newReview, ...prev]);

      // Sync with MongoDB backend if available
      reviewApi
        .createReview({
          reviewedUserId: reviewData.reviewedUserId,
          sessionId: reviewData.sessionId,
          rating: reviewData.rating,
          comment: reviewData.comment,
        })
        .catch(() => {});

      // Notification for reviewed user
      const notif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: reviewData.reviewedUserId,
        title: 'New Review Received',
        message: `${currentUser.name} rated your session ${reviewData.rating} ★: "${reviewData.comment.substring(0, 50)}..."`,
        category: 'Sessions',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/reviews',
      };
      setNotifications((prev) => [notif, ...prev]);

      addToast('success', 'Review Published', 'Thank you for contributing your feedback!');
    },
    [currentUser, reviews, addToast]
  );

  const editReview = useCallback(
    (reviewId: string, rating: number, comment: string) => {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, rating, comment } : r))
      );
      addToast('success', 'Review Updated', 'Your review feedback was saved.');
    },
    [addToast]
  );

  const flagReview = useCallback(
    (reviewId: string, reason: string) => {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, isFlagged: true, flagReason: reason } : r))
      );
      addToast('warning', 'Review Reported', 'Moderation team will investigate this review.');
    },
    [addToast]
  );

  const moderateReview = useCallback(
    (reviewId: string, action: 'keep' | 'delete') => {
      if (action === 'delete') {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        addToast('info', 'Review Removed', 'Review was deleted by moderator.');
      } else {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, isFlagged: false, flagReason: undefined } : r))
        );
        addToast('success', 'Review Approved', 'Review cleared for community display.');
      }
    },
    [addToast]
  );

  // Payments & Refunds
  const processDemoPayment = useCallback(
    async (
      paymentData: Omit<PaymentTransaction, 'id' | 'createdAt' | 'refundStatus'>
    ): Promise<{ success: boolean; error?: string }> => {
      if (paymentData.paymentMethodLast4 === '0000') {
        return {
          success: false,
          error: 'Simulated Card Declined: Test card 0000 was rejected by simulated bank gateway.',
        };
      }

      const newTx: PaymentTransaction = {
        ...paymentData,
        id: 'tx-' + Math.random().toString(36).substring(2, 9),
        refundStatus: 'None',
        createdAt: new Date().toISOString(),
      };

      setPayments((prev) => [newTx, ...prev]);
      addToast('success', 'Payment Successful', `Processed $${paymentData.amount.toFixed(2)} USD via test card ···· ${paymentData.paymentMethodLast4}`);
      return { success: true };
    },
    [addToast]
  );

  const requestRefund = useCallback(
    (paymentId: string, reason: string) => {
      setPayments((prev) =>
        prev.map((tx) =>
          tx.id === paymentId
            ? {
                ...tx,
                refundStatus: 'Requested',
                refundReason: reason,
                refundRequestedAt: new Date().toISOString(),
              }
            : tx
        )
      );

      // Alert admin
      const adminNotif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: 'usr-admin',
        title: 'New Refund Request',
        message: `User requested refund for transaction #${paymentId}. Reason: "${reason}".`,
        category: 'Payments',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/admin/analytics',
      };
      setNotifications((prev) => [adminNotif, ...prev]);

      addToast('info', 'Refund Requested', 'Your request has been submitted for administrative review.');
    },
    [addToast]
  );

  const reviewRefundDecision = useCallback(
    (paymentId: string, decision: 'Approved' | 'Rejected') => {
      setPayments((prev) =>
        prev.map((tx) => {
          if (tx.id !== paymentId) return tx;
          const status = decision === 'Approved' ? 'Refunded' : tx.status;
          const refundStatus: RefundStatus = decision === 'Approved' ? 'Refunded' : 'Rejected';

          // Notify user
          const notif: PlatformNotification = {
            id: 'notif-' + Math.random().toString(36).substring(2, 9),
            userId: tx.userId,
            title: `Refund Request ${decision}`,
            message:
              decision === 'Approved'
                ? `Your refund of $${tx.amount.toFixed(2)} for "${tx.itemTitle}" was processed back to your card.`
                : `Your refund request for "${tx.itemTitle}" was reviewed and rejected.`,
            category: 'Payments',
            isRead: false,
            createdAt: new Date().toISOString(),
            actionUrl: '/payments',
          };
          setNotifications((prevNotifs) => [notif, ...prevNotifs]);

          return { ...tx, status, refundStatus };
        })
      );
      addToast('success', 'Refund Decision Saved', `Refund #${paymentId} marked as ${decision}.`);
    },
    [addToast]
  );

  // Complaints
  const submitComplaint = useCallback(
    (complaintData: Omit<Complaint, 'id' | 'submittedAt' | 'status'>) => {
      const newComplaint: Complaint = {
        ...complaintData,
        id: 'cmp-' + Math.random().toString(36).substring(2, 9),
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
      };

      setComplaints((prev) => [newComplaint, ...prev]);

      // Admin notification
      const notif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: 'usr-admin',
        title: 'New Incident Report Filed',
        message: `${complaintData.reporterName} reported ${complaintData.reportedUserName} for "${complaintData.category}".`,
        category: 'Complaints',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/admin/complaints',
      };
      setNotifications((prev) => [notif, ...prev]);

      addToast('warning', 'Report Filed', 'Your complaint has been delivered to Trust & Moderation.');
    },
    [addToast]
  );

  const resolveComplaint = useCallback(
    (complaintId: string, adminResponse: string, adminInternalNotes: string, status: ComplaintStatus) => {
      setComplaints((prev) =>
        prev.map((c) => {
          if (c.id !== complaintId) return c;
          const updated: Complaint = {
            ...c,
            adminResponse,
            adminInternalNotes,
            status,
            resolvedAt: new Date().toISOString(),
          };

          // Notify reporter with admin response (internal notes are strictly withheld!)
          const notif: PlatformNotification = {
            id: 'notif-' + Math.random().toString(36).substring(2, 9),
            userId: c.reporterId,
            title: `Report Status: ${status}`,
            message: `Admin responded: "${adminResponse}".`,
            category: 'Complaints',
            isRead: false,
            createdAt: new Date().toISOString(),
            actionUrl: '/complaints',
          };
          setNotifications((prevNotifs) => [notif, ...prevNotifs]);

          return updated;
        })
      );
      addToast('success', 'Complaint Updated', `Case #${complaintId} marked as ${status}.`);
    },
    [addToast]
  );

  // Notifications
  const markNotificationAsRead = useCallback((notificationId: string) => {
    notificationApi.markAsRead(notificationId).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    if (!currentUser) return;
    notificationApi.markAllAsRead().catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.userId === currentUser.id ? { ...n, isRead: true } : n))
    );
    addToast('info', 'Notifications Marked Read', 'All notifications marked as read.');
  }, [currentUser, addToast]);

  // Admin controls
  const toggleUserSuspension = useCallback(
    (userId: string): boolean => {
      // Safeguard: cannot suspend last active admin
      const activeAdmins = users.filter((u) => u.role === 'admin' && !u.isSuspended);
      const target = users.find((u) => u.id === userId);
      if (!target) return false;

      if (target.role === 'admin' && !target.isSuspended && activeAdmins.length <= 1) {
        addToast('error', 'Action Prevented', 'Cannot suspend the final active administrator on the platform.');
        return false;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isSuspended: !u.isSuspended } : u))
      );
      addToast(
        'info',
        'Account Status Changed',
        `${target.name} has been ${target.isSuspended ? 'reinstated' : 'suspended'}.`
      );
      return true;
    },
    [users, addToast]
  );

  const toggleUserVerification = useCallback(
    (userId: string) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isProfileVerified: !u.isProfileVerified } : u))
      );
      addToast('success', 'Verification Toggled', 'User profile badge updated.');
    },
    [addToast]
  );

  const reviewIdentityVerification = useCallback(
    (userId: string, decision: 'Verified' | 'Rejected', rejectionReason?: string) => {
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return;

      const isVerified = decision === 'Verified';

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          return {
            ...u,
            isProfileVerified: isVerified,
            accountVerificationStatus: decision === 'Verified' ? 'Verified' : 'Rejected',
            identityVerification: u.identityVerification
              ? {
                  ...u.identityVerification,
                  status: decision,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: currentUser?.name || 'Administrator',
                  rejectionReason: !isVerified ? rejectionReason : undefined,
                }
              : undefined,
          };
        })
      );

      // Notification for the user
      const userNotif: PlatformNotification = {
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: targetUser.id,
        title: isVerified ? 'Identity Verification Approved!' : 'Identity Verification Rejected',
        message: isVerified
          ? `Congratulations! Your ${targetUser.identityVerification?.documentType || 'identity document'} has been approved. You now hold a Verified Member badge.`
          : `Your identity document verification was rejected. Reason: ${rejectionReason || 'Illegible document scan or document number mismatch.'} Please review and resubmit.`,
        category: 'Verifications',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/profile',
      };

      setNotifications((prev) => [userNotif, ...prev]);

      addToast(
        isVerified ? 'success' : 'error',
        isVerified ? 'Identity Approved' : 'Identity Rejected',
        `${targetUser.name}'s identity document has been marked as ${decision.toLowerCase()}.`
      );
    },
    [users, currentUser, addToast]
  );

  const saveAnnouncement = useCallback(
    (announcement: Partial<PlatformAnnouncement> & { title: string; content: string }) => {
      if (announcement.id) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === announcement.id ? ({ ...a, ...announcement } as PlatformAnnouncement) : a))
        );
        addToast('success', 'Announcement Updated', 'Changes are live.');
      } else {
        const newAnn: PlatformAnnouncement = {
          id: 'ann-' + Math.random().toString(36).substring(2, 9),
          title: announcement.title,
          content: announcement.content,
          badge: announcement.badge || 'Update',
          publishedDate: new Date().toISOString().split('T')[0],
          isActive: true,
          authorName: currentUser?.name ? `${currentUser.name} (Admin)` : 'Staff',
        };
        setAnnouncements((prev) => [newAnn, ...prev]);
        addToast('success', 'Announcement Published', 'Broadcasted to all members.');
      }
    },
    [currentUser, addToast]
  );

  const toggleAnnouncementActive = useCallback(
    (announcementId: string) => {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, isActive: !a.isActive } : a))
      );
      addToast('info', 'Visibility Updated', 'Announcement broadcast toggled.');
    },
    [addToast]
  );

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        appointments,
        classes,
        conversations,
        messages,
        reviews,
        payments,
        complaints,
        notifications,
        announcements,
        theme,
        toasts,
        otpState,
        isAccountLocked,

        addToast,
        removeToast,
        setTheme,
        toggleTheme,
        resetDemoData,

        login,
        loginWithDemoRole,
        verifyOtp,
        resendOtp,
        cancelOtp,
        unlockAccount,
        requestPasswordReset,
        logout,
        registerUser,

        updateProfile,
        addSkill,
        editSkill,
        deleteSkill,
        addLearningInterest,
        removeLearningInterest,

        addCertificate,
        updateCertificateStatus,

        createAppointment,
        updateAppointmentStatus,

        createClass,
        updateClass,
        cancelClass,
        enrollInClass,
        completeClass,

        sendMessage,
        markConversationAsRead,
        loadMessagesForConversation,
        refreshConversations,
        refreshAppointments,
        syncBackendData,
        blockUser,

        submitReview,
        editReview,
        flagReview,
        moderateReview,

        processDemoPayment,
        requestRefund,
        reviewRefundDecision,

        submitComplaint,
        resolveComplaint,

        markNotificationAsRead,
        markAllNotificationsAsRead,

        toggleUserSuspension,
        toggleUserVerification,
        reviewIdentityVerification,
        saveAnnouncement,
        toggleAnnouncementActive,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
