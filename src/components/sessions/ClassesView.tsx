/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { classApi } from '../../services/api';
import { ClassSession } from '../../types';
import { ClassModal } from './ClassModal';
import { PaymentModal } from '../payments/PaymentModal';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  ExternalLink,
  X,
  Info,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const JOIN_WINDOW_MINUTES = 15;

export const ClassesView: React.FC = () => {
  const {
    currentUser,
    classes,
    categories,
    cancelClass,
    completeClass,
    enrollInClass,
    addToast,
  } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [filterType, setFilterType] = useState<'my_sessions' | 'my_enrollments' | 'all' | 'free' | 'paid'>('my_sessions');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [backendScopedClasses, setBackendScopedClasses] = useState<ClassSession[] | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSession | undefined>(undefined);
  const [detailsClass, setDetailsClass] = useState<ClassSession | null>(null);
  const [payingSession, setPayingSession] = useState<ClassSession | null>(null);
  const [cancellingClass, setCancellingClass] = useState<ClassSession | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Keep join-window countdown fresh every 30s while details modal is open
  useEffect(() => {
    if (!detailsClass) return;
    setNowTick(Date.now());
    const id = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [detailsClass]);

  // Auto-open create modal if URL has ?action=new (teachers/admins only)
  useEffect(() => {
    if (
      searchParams.get('action') === 'new' &&
      currentUser &&
      (currentUser.role === 'teacher' || currentUser.role === 'admin')
    ) {
      setIsClassModalOpen(true);
    }
  }, [searchParams, currentUser]);

  // Open class details directly if ?classId=... is passed (e.g. from notification)
  useEffect(() => {
    const classId = searchParams.get('classId');
    if (!classId || !currentUser) return;
    let cancelled = false;
    classApi
      .getClassById(classId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setDetailsClass(res.data);
          setFilterType('all');
        }
      })
      .catch(() => {
        const local = classes.find((c) => c.id === classId);
        if (local) setDetailsClass(local);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, currentUser]);

  // Fetch user-scoped workshops from MongoDB backend
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const scope =
      filterType === 'all'
        ? 'public'
        : filterType === 'my_enrollments'
        ? 'my_enrollments'
        : 'my_sessions';

    setIsLoadingClasses(true);
    classApi
      .getClasses({
        scope,
        tab: activeTab,
        pricing: filterType === 'free' ? 'free' : filterType === 'paid' ? 'paid' : 'all',
        category: selectedCategory,
      })
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          setBackendScopedClasses(res.data);
          if (detailsClass) {
            const refreshed = res.data.find((c: ClassSession) => c.id === detailsClass.id);
            if (refreshed) setDetailsClass(refreshed);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingClasses(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, activeTab, filterType, selectedCategory, classes]);

  if (!currentUser) return null;

  const canHostClasses = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const sourceClasses = backendScopedClasses ?? classes;

  const filteredClasses = sourceClasses.filter((cls) => {
    if (activeTab === 'upcoming' && (cls.status === 'Completed' || cls.status === 'Cancelled')) {
      return false;
    }
    if (activeTab === 'past' && cls.status !== 'Completed' && cls.status !== 'Cancelled') {
      return false;
    }

    const isEnrolled = cls.enrolledUserIds.includes(currentUser.id);
    const isTeacher = cls.teacherId === currentUser.id;

    if (filterType === 'my_enrollments') {
      if (!isEnrolled) return false;
    } else if (filterType !== 'all') {
      if (currentUser.role === 'teacher') {
        if (!isTeacher && !isEnrolled) return false;
      } else {
        if (!isEnrolled) return false;
      }
    }

    if (filterType === 'free' && !cls.isFree) return false;
    if (filterType === 'paid' && cls.isFree) return false;
    if (selectedCategory !== 'All' && cls.category !== selectedCategory) return false;

    return true;
  });

  const handleEnrollClick = async (cls: ClassSession) => {
    if (!cls.isFree && cls.price > 0) {
      setPayingSession(cls);
      return;
    }
    setIsProcessingAction(true);
    try {
      const ok = await enrollInClass(cls.id);
      if (ok && detailsClass?.id === cls.id) {
        const res = await classApi.getClassById(cls.id);
        if (res.success && res.data) setDetailsClass(res.data);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  const getJoinState = (cls: ClassSession) => {
    const startMs = new Date(cls.dateTime).getTime();
    const endMs = startMs + (cls.durationMinutes || 60) * 60 * 1000;
    const windowStartMs = startMs - JOIN_WINDOW_MINUTES * 60 * 1000;

    if (cls.status === 'Cancelled') {
      return { canJoin: false, reason: 'This class was cancelled.' };
    }
    if (cls.status === 'Completed' || nowTick > endMs) {
      return { canJoin: false, reason: 'This class has ended.' };
    }
    if (nowTick < windowStartMs) {
      const diffMins = Math.ceil((windowStartMs - nowTick) / 60000);
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const timeText = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      return {
        canJoin: false,
        reason: `Joining opens ${JOIN_WINDOW_MINUTES} mins before start (in ${timeText}).`,
      };
    }
    if (!cls.meetingLink) {
      return {
        canJoin: false,
        reason: 'Instructor has not added an external meeting link yet.',
      };
    }
    return { canJoin: true, reason: 'Session window is open.' };
  };

  const handleJoinMeeting = (cls: ClassSession) => {
    const state = getJoinState(cls);
    if (!state.canJoin || !cls.meetingLink) {
      addToast('info', 'Join Unavailable', state.reason);
      return;
    }
    window.open(cls.meetingLink, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingClass) return;
    setIsProcessingAction(true);
    try {
      const ok = await cancelClass(
        cancellingClass.id,
        cancelReason.trim() || 'Cancelled by instructor.'
      );
      if (ok) {
        setCancellingClass(null);
        setCancelReason('');
        setDetailsClass(null);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Live Classes &amp; Workshops
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Group masterclasses, practice labs, and interactive mentorship sessions.
          </p>
        </div>

        {canHostClasses && (
          <button
            type="button"
            onClick={() => {
              setEditingClass(undefined);
              setIsClassModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Host a Class</span>
          </button>
        )}
      </div>

      {/* Tabs and Secondary Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            Scheduled Workshops
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'past'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            Past Archive
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['my_sessions', 'my_enrollments', 'all', 'free', 'paid'] as const).map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => setFilterType(ft)}
                className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap transition-colors cursor-pointer ${
                  filterType === ft
                    ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                {ft === 'my_sessions'
                  ? 'My Sessions'
                  : ft === 'my_enrollments'
                  ? 'My Enrollments'
                  : ft === 'all'
                  ? 'All Workshops'
                  : ft}
              </button>
            ))}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 text-xs"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Classes Grid */}
      {isLoadingClasses && filteredClasses.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="w-7 h-7 border-3 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-neutral-500">Loading your workshops...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <Video className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {activeTab === 'past' ? 'No Past Sessions' : 'No Upcoming Sessions Yet'}
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'past'
              ? 'Your completed workshops will appear here.'
              : filterType === 'all'
              ? 'No scheduled workshops match your current filters.'
              : "You haven't enrolled in any workshops yet. Explore available workshops and join a session to start learning."}
          </p>
          {activeTab === 'upcoming' && filterType !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('upcoming');
                setFilterType('all');
                setSelectedCategory('All');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Discover Workshops
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const isTeacher = currentUser.id === cls.teacherId;
            const isEnrolled = cls.enrolledUserIds.includes(currentUser.id);
            const seatCount = cls.enrolledCount ?? cls.enrolledUserIds.length;
            const isFull = seatCount >= cls.capacity;
            const joinState = getJoinState(cls);

            return (
              <div
                key={cls.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  {cls.thumbnailUrl && (
                    <img
                      src={cls.thumbnailUrl}
                      alt={cls.title}
                      className="w-full h-32 object-cover rounded-xl mb-3 border border-neutral-200 dark:border-neutral-800"
                    />
                  )}

                  {/* Category and Price Pill */}
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-medium truncate">
                      {cls.category} · {cls.format}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                      {cls.isFree ? 'Free' : `$${cls.price} USD`}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-1.5 leading-snug">
                    {cls.title}
                  </h3>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {cls.description}
                  </p>

                  {/* Metadata Info */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Instructor:</span>
                      <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[150px]">
                        {cls.teacherName} {isTeacher && '(You)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Date &amp; Time:</span>
                      <span>
                        {new Date(cls.dateTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Seats:</span>
                      <span className="font-mono tabular-nums">
                        {seatCount} / {cls.capacity} enrolled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    variant={
                      cls.status === 'Completed'
                        ? 'neutral'
                        : cls.status === 'Cancelled'
                        ? 'error'
                        : isEnrolled || isTeacher
                        ? 'success'
                        : 'info'
                    }
                  >
                    {cls.status === 'Scheduled' && isEnrolled
                      ? 'Enrolled'
                      : cls.status === 'Scheduled' && isTeacher
                      ? 'Hosting'
                      : cls.status}
                  </Badge>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDetailsClass(cls)}
                      className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    {/* Join Class button for enrolled students & host */}
                    {cls.status === 'Scheduled' && (isEnrolled || isTeacher) && joinState.canJoin && (
                      <button
                        type="button"
                        onClick={() => handleJoinMeeting(cls)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Join Class</span>
                      </button>
                    )}

                    {/* Enrollment Button for non-enrolled students */}
                    {cls.status === 'Scheduled' && !isTeacher && !isEnrolled && (
                      <button
                        type="button"
                        onClick={() => handleEnrollClick(cls)}
                        disabled={isFull || isProcessingAction}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          isFull
                            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                            : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800'
                        }`}
                      >
                        {isFull ? 'Full' : cls.isFree ? 'Enroll Now' : `$${cls.price} USD`}
                      </button>
                    )}

                    {/* Teacher quick controls */}
                    {isTeacher && cls.status === 'Scheduled' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClass(cls);
                            setIsClassModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingClass(cls);
                            setCancelReason('');
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Class Create / Edit Modal */}
      {isClassModalOpen && (
        <ClassModal
          initialClass={editingClass}
          isOpen={isClassModalOpen}
          onClose={() => {
            setIsClassModalOpen(false);
            setEditingClass(undefined);
          }}
        />
      )}

      {/* Class Details Modal */}
      {detailsClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl my-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{detailsClass.category}</span>
                  <span>·</span>
                  <span>{detailsClass.format}</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                  {detailsClass.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailsClass(null);
                  if (searchParams.get('classId')) {
                    searchParams.delete('classId');
                    setSearchParams(searchParams, { replace: true });
                  }
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsClass.thumbnailUrl && (
              <img
                src={detailsClass.thumbnailUrl}
                alt={detailsClass.title}
                className="w-full h-44 object-cover rounded-xl border border-neutral-200 dark:border-neutral-800"
              />
            )}

            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {detailsClass.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Instructor</span>
                <button
                  type="button"
                  onClick={() => {
                    const tid = detailsClass.teacherId;
                    setDetailsClass(null);
                    navigate(`/profile/${tid}`);
                  }}
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer text-left"
                >
                  {detailsClass.teacherName}
                </button>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Skill / Topic</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{detailsClass.skillName}</span>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Date &amp; Start Time</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {new Date(detailsClass.dateTime).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Duration &amp; Pricing</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {detailsClass.durationMinutes} mins · {detailsClass.isFree ? 'Free' : `$${detailsClass.price} USD`}
                </span>
              </div>
            </div>

            {detailsClass.instructions && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">
                  Meeting Instructions
                </span>
                <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {detailsClass.instructions}
                </p>
              </div>
            )}

            {/* Paid class notice */}
            {!detailsClass.isFree &&
              detailsClass.price > 0 &&
              detailsClass.teacherId !== currentUser.id &&
              !detailsClass.enrolledUserIds.includes(currentUser.id) && (
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-200 flex items-center justify-between gap-3">
                  <span>
                    Paid Workshop (${detailsClass.price.toFixed(2)} USD) — Simulated Demo Checkout available.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailsClass;
                      setDetailsClass(null);
                      setPayingSession(target);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg cursor-pointer shrink-0"
                  >
                    Enroll via Demo Pay
                  </button>
                </div>
              )}

            {/* Join Window Status for enrolled students & host teacher */}
            {(detailsClass.enrolledUserIds.includes(currentUser.id) ||
              detailsClass.teacherId === currentUser.id) && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>{getJoinState(detailsClass).reason}</span>
                </div>
                {getJoinState(detailsClass).canJoin && (
                  <button
                    type="button"
                    onClick={() => handleJoinMeeting(detailsClass)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Join Class</span>
                  </button>
                )}
              </div>
            )}

            {/* Host Teacher: Enrolled Students List & Management */}
            {detailsClass.teacherId === currentUser.id && (
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-neutral-500" />
                    <span>
                      Enrolled Students ({detailsClass.enrolledCount ?? detailsClass.enrolledUserIds.length} / {detailsClass.capacity})
                    </span>
                  </span>
                </div>
                {detailsClass.enrolledStudents && detailsClass.enrolledStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {detailsClass.enrolledStudents.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs"
                      >
                        <Avatar
                          name={st.name}
                          avatarUrl={st.avatarUrl}
                          bgColor={st.avatarBgColor || '#0284c7'}
                          size="sm"
                        />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {st.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500">No students enrolled yet.</p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-end gap-2">
              {detailsClass.teacherId === currentUser.id && detailsClass.status === 'Scheduled' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailsClass;
                      setDetailsClass(null);
                      setEditingClass(target);
                      setIsClassModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg cursor-pointer"
                  >
                    Edit / Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => completeClass(detailsClass.id)}
                    className="px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingClass(detailsClass);
                      setCancelReason('');
                    }}
                    className="px-3.5 py-2 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg cursor-pointer"
                  >
                    Cancel Class
                  </button>
                </>
              )}

              {detailsClass.status === 'Scheduled' &&
                detailsClass.teacherId !== currentUser.id &&
                !detailsClass.enrolledUserIds.includes(currentUser.id) &&
                detailsClass.isFree && (
                  <button
                    type="button"
                    disabled={
                      isProcessingAction ||
                      (detailsClass.enrolledCount ?? detailsClass.enrolledUserIds.length) >=
                        detailsClass.capacity
                    }
                    onClick={() => handleEnrollClick(detailsClass)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                  >
                    Enroll Now (Free)
                  </button>
                )}

              <button
                type="button"
                onClick={() => setDetailsClass(null)}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Class Reason Modal */}
      {cancellingClass && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Cancel Live Class
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Provide a reason for cancelling &ldquo;{cancellingClass.title}&rdquo;. Enrolled students will be notified.
            </p>
            <form onSubmit={handleConfirmCancel} className="mt-4 space-y-4">
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, rescheduling for next week."
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingClass(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Keep Class
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingAction ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demo Payment Checkout Modal */}
      {payingSession && (
        <PaymentModal
          session={payingSession}
          isOpen={!!payingSession}
          onSuccess={() => {
            // Refresh scoped classes after successful demo payment
            classApi
              .getClasses({
                scope:
                  filterType === 'all'
                    ? 'public'
                    : filterType === 'my_enrollments'
                    ? 'my_enrollments'
                    : 'my_sessions',
                tab: activeTab,
              })
              .then((res) => {
                if (res.success && Array.isArray(res.data)) {
                  setBackendScopedClasses(res.data);
                }
              })
              .catch(() => {});
          }}
          onClose={() => setPayingSession(null)}
        />
      )}
    </div>
  );
};
