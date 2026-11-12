/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ClassSession } from '../../types';
import { ClassModal } from './ClassModal';
import { MeetingRoomModal } from './MeetingRoomModal';
import { PaymentModal } from '../payments/PaymentModal';
import { Badge } from '../common/Badge';
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

export const ClassesView: React.FC = () => {
  const { currentUser, classes, cancelClass, completeClass, enrollInClass } = useApp();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [filterType, setFilterType] = useState<'all' | 'my_classes' | 'free' | 'paid'>('all');

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSession | undefined>(undefined);
  const [activeMeetingSession, setActiveMeetingSession] = useState<ClassSession | null>(null);
  const [payingSession, setPayingSession] = useState<ClassSession | null>(null);

  // Auto-open modal if URL has ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsClassModalOpen(true);
    }
  }, [searchParams]);

  if (!currentUser) return null;

  const now = new Date();

  const filteredClasses = classes.filter((cls) => {
    // Upcoming vs Past
    if (activeTab === 'upcoming' && (cls.status === 'Completed' || cls.status === 'Cancelled')) {
      return false;
    }
    if (activeTab === 'past' && cls.status !== 'Completed' && cls.status !== 'Cancelled') {
      return false;
    }

    // Filter type
    if (filterType === 'my_classes') {
      const isEnrolled = cls.enrolledUserIds.includes(currentUser.id);
      const isTeacher = cls.teacherId === currentUser.id;
      if (!isEnrolled && !isTeacher) return false;
    }
    if (filterType === 'free' && !cls.isFree) return false;
    if (filterType === 'paid' && cls.isFree) return false;

    return true;
  });

  const handleEnrollClick = (cls: ClassSession) => {
    if (cls.isFree || cls.price === 0) {
      enrollInClass(cls.id);
    } else {
      setPayingSession(cls);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Live Classes & Workshops
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Group masterclasses, practice labs, and interactive mentorship sessions.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingClass(undefined);
            setIsClassModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Host a Class</span>
        </button>
      </div>

      {/* Tabs and Secondary Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-1">
          <button
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

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(['all', 'my_classes', 'free', 'paid'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                filterType === ft
                  ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              {ft === 'all' ? 'All Workshops' : ft === 'my_classes' ? 'My Enrollments' : ft}
            </button>
          ))}
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <Video className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            No workshops found
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'No scheduled classes currently meet these filters. Create the first one!'
              : 'No completed workshops archived yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const isTeacher = currentUser.id === cls.teacherId;
            const isEnrolled = cls.enrolledUserIds.includes(currentUser.id);
            const isFull = cls.enrolledUserIds.length >= cls.capacity;

            return (
              <div
                key={cls.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Category and Price Pill */}
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-medium">{cls.category} · {cls.format}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
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
                      <span className="text-neutral-500">Date & Time:</span>
                      <span>{new Date(cls.dateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Seat Capacity:</span>
                      <span className="font-mono tabular-nums">
                        {cls.enrolledUserIds.length} / {cls.capacity} seats taken
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                  {/* Status Badge */}
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
                    {cls.status === 'Scheduled' && (isEnrolled || isTeacher)
                      ? 'Enrolled'
                      : cls.status}
                  </Badge>

                  <div className="flex items-center gap-2">
                    {/* Launch Room Button for participants & host */}
                    {cls.status === 'Scheduled' && (isEnrolled || isTeacher) && (
                      <button
                        onClick={() => setActiveMeetingSession(cls)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Launch Room</span>
                      </button>
                    )}

                    {/* Enrollment Button for non-enrolled students */}
                    {cls.status === 'Scheduled' && !isTeacher && !isEnrolled && (
                      <button
                        onClick={() => handleEnrollClick(cls)}
                        disabled={isFull}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          isFull
                            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                            : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800'
                        }`}
                      >
                        {isFull ? 'Sold Out' : cls.isFree ? 'Join Free' : `Enroll · $${cls.price}`}
                      </button>
                    )}

                    {/* Teacher controls */}
                    {isTeacher && cls.status === 'Scheduled' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingClass(cls);
                            setIsClassModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => cancelClass(cls.id, 'Cancelled by teacher due to schedule conflict.')}
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

      {/* Simulated Live Video Meeting Room */}
      {activeMeetingSession && (
        <MeetingRoomModal
          session={activeMeetingSession}
          isOpen={!!activeMeetingSession}
          onClose={() => setActiveMeetingSession(null)}
        />
      )}

      {/* Payment Checkout Modal for Paid Classes */}
      {payingSession && (
        <PaymentModal
          session={payingSession}
          isOpen={!!payingSession}
          onSuccess={() => setPayingSession(null)}
          onClose={() => setPayingSession(null)}
        />
      )}
    </div>
  );
};
