/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Appointment } from '../../types';
import { StatCard } from './StatCard';
import { DashboardSearchResults } from './DashboardSearchResults';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { StarRating } from '../common/StarRating';
import {
  DollarSign,
  Users,
  Video,
  Star,
  Plus,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  X,
  MessageSquare,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const {
    currentUser,
    appointments,
    classes,
    reviews,
    updateAppointmentStatus,
    refreshAppointments,
    openAppointmentConversation,
    dashboardSearchQuery,
    setDashboardSearchQuery,
    dashboardSearchSubmitCount,
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  if (!currentUser) return null;

  // Teacher classes
  const teacherClasses = classes.filter((c) => c.teacherId === currentUser.id);
  const upcomingClasses = teacherClasses.filter((c) => c.status === 'Scheduled');

  // Incoming appointment requests
  const incomingRequests = appointments.filter(
    (a) => a.teacherId === currentUser.id && a.status === 'Pending'
  );

  const teacherUpcomingAppointments = appointments.filter(
    (a) => a.teacherId === currentUser.id && a.status === 'Accepted'
  );

  // Reviews for teacher
  const teacherReviews = reviews.filter((r) => r.reviewedUserId === currentUser.id);

  // Request action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingAppointment, setRejectingAppointment] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [viewingDetailsAppointment, setViewingDetailsAppointment] = useState<Appointment | null>(null);

  const handleAccept = async (aptId: string) => {
    try {
      setProcessingId(aptId);
      await updateAppointmentStatus(aptId, 'Accepted');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppointment) return;
    try {
      setProcessingId(rejectingAppointment.id);
      await updateAppointmentStatus(rejectingAppointment.id, 'Rejected', rejectionReason.trim());
      setRejectingAppointment(null);
      setRejectionReason('');
    } finally {
      setProcessingId(null);
    }
  };

  // Teaching skills count & verification
  const totalSkills = currentUser.teachingSkills.length;
  const verifiedSkillsCount = currentUser.teachingSkills.filter(
    (s) => s.verificationStatus === 'Verified'
  ).length;

  return (
    <div className="space-y-6">
      {/* Identity Verification Status Banner */}
      {currentUser.identityVerification?.status === 'Pending' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-100">
              Instructor Identity Verification In Progress
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
              Your <strong>{currentUser.identityVerification.documentType}</strong> ({currentUser.identityVerification.documentNumber}) is queued for administrative accreditation. You can configure courses and draft syllabi while we verify your identity.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 uppercase tracking-wider shrink-0">
            Pending Review
          </span>
        </div>
      )}

      {currentUser.identityVerification?.status === 'Rejected' && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-100">
              Identity Verification Attention Needed
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
              Your {currentUser.identityVerification.documentType} was not verified. Reason: <em>{currentUser.identityVerification.rejectionReason || 'Document illegible or information mismatch.'}</em>
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Instructor Studio — {currentUser.name}
            </h1>
            {currentUser.isProfileVerified && (
              <span className="text-sky-600 dark:text-sky-400" title="Accredited Teacher">
                <CheckCircle2 className="w-5 h-5 fill-current" />
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
            Manage your teaching schedule, accept 1-on-1 sessions, review student requests, and track your simulated earnings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/classes?action=new')}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Class</span>
          </button>
          <button
            onClick={() => navigate('/skills')}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Manage Skills</span>
          </button>
        </div>
      </div>

      {/* In-Place Dashboard Search Results or Normal Teacher Dashboard Content */}
      {dashboardSearchQuery.trim().length > 0 ? (
        <DashboardSearchResults
          query={dashboardSearchQuery}
          submitCount={dashboardSearchSubmitCount}
          onClear={() => setDashboardSearchQuery('')}
        />
      ) : (
        <>
          {/* Teacher KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Simulated Earnings"
          value={`$${currentUser.totalEarnings.toLocaleString()} USD`}
          subValue="Demo lesson revenue"
          icon={DollarSign}
        />
        <StatCard
          label="Completed Sessions"
          value={currentUser.completedSessionsCount}
          subValue="1-on-1s & workshops"
          icon={Users}
        />
        <StatCard
          label="Average Rating"
          value={`${currentUser.rating.toFixed(2)} ★`}
          subValue={`${teacherReviews.length} verified reviews`}
          icon={Star}
        />
        <StatCard
          label="Active Skills"
          value={totalSkills}
          subValue={`${verifiedSkillsCount} verified by admin`}
          icon={BookOpen}
        />
      </div>

      {/* Grid: Incoming Requests & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Incoming Student Requests & Upcoming Teaching Sessions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incoming requests */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Incoming Student Requests ({incomingRequests.length})
                </h2>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
              >
                View Requests
              </button>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No pending student requests. Your schedule is currently clear!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <Avatar
                        name={req.learnerName}
                        avatarUrl={req.learnerAvatarUrl}
                        bgColor={req.learnerAvatarBgColor || '#0284c7'}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {req.requestedDate}
                          </span>
                          <span>·</span>
                          <span>{req.startTime} ({req.durationMinutes}m)</span>
                          <span>·</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {req.isFreeSwap ? 'Free Skill Swap' : `$${req.totalCost} USD`}
                          </span>
                          <span>·</span>
                          <Badge variant="warning">Pending</Badge>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white mt-1">
                          {req.skillName}
                        </h4>

                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                          Student: <strong>{req.learnerName}</strong>
                          {req.learnerHeadline ? ` · ${req.learnerHeadline}` : ''}
                          {req.isFreeSwap && req.offeredSwapSkillName && (
                            <span className="text-sky-600 dark:text-sky-400 font-medium"> (Offering: {req.offeredSwapSkillName})</span>
                          )}
                        </p>

                        {req.message && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 italic mt-2 bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 leading-relaxed">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}

                        <p className="text-[11px] text-neutral-400 mt-2">
                          Received on {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => setViewingDetailsAppointment(req)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        disabled={processingId === req.id}
                        onClick={() => handleAccept(req.id)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{processingId === req.id ? 'Accepting...' : 'Accept'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={processingId === req.id}
                        onClick={() => {
                          setRejectingAppointment(req);
                          setRejectionReason('');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Teaching Sessions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-neutral-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Scheduled Classes & Teaching Sessions
                </h2>
              </div>
              <button
                onClick={() => navigate('/classes')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
              >
                Manage Classes
              </button>
            </div>

            {upcomingClasses.length === 0 && teacherUpcomingAppointments.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  You have no scheduled sessions at the moment.
                </p>
                <button
                  onClick={() => navigate('/classes?action=new')}
                  className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Create Workshop Class
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>Workshop</span>
                        <span>·</span>
                        <span>{new Date(cls.dateTime).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{cls.enrolledUserIds.length}/{cls.capacity} Enrolled</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">
                        {cls.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Price: {cls.isFree ? 'Free' : `$${cls.price} USD`} · Duration: {cls.durationMinutes}m
                      </p>
                    </div>

                    <button
                      onClick={() => navigate('/classes')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Host Session
                    </button>
                  </div>
                ))}

                {teacherUpcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>1-on-1 Mentorship</span>
                        <span>·</span>
                        <span>{apt.requestedDate} at {apt.startTime}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">
                        {apt.skillName} with {apt.learnerName}
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Format: {apt.isFreeSwap ? 'Free Skill Swap' : `$${apt.totalCost} USD`} · {apt.durationMinutes}m
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          const conv = await openAppointmentConversation(apt.id);
                          if (conv) {
                            navigate(`/messages?conversation=${encodeURIComponent(conv.id)}&appointment=${encodeURIComponent(apt.id)}&user=${encodeURIComponent(apt.learnerId)}`);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message Student</span>
                      </button>
                      <button
                        onClick={() => navigate('/appointments')}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Student Reviews & Certificates */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Recent Reviews
                </h2>
              </div>
              <button
                onClick={() => navigate('/reviews')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
              >
                All Reviews
              </button>
            </div>

            {teacherReviews.length === 0 ? (
              <p className="text-xs text-neutral-500">No student reviews received yet.</p>
            ) : (
              <div className="space-y-3.5">
                {teacherReviews.slice(0, 3).map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                        {rev.reviewerName}
                      </span>
                      <StarRating rating={rev.rating} size="sm" />
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-3">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                    <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between">
                      <span>{rev.sessionTitle}</span>
                      <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Credentials Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Teaching Credentials
                </h2>
              </div>
              <button
                onClick={() => navigate('/certificates')}
                className="text-xs text-sky-600 dark:text-sky-400 font-medium hover:underline cursor-pointer"
              >
                Upload
              </button>
            </div>
            <div className="space-y-2">
              {currentUser.certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-semibold text-neutral-900 dark:text-white block truncate">
                      {cert.title}
                    </span>
                    <span className="text-[10px] text-neutral-500">{cert.issuingOrganization}</span>
                  </div>
                  <Badge variant={cert.status === 'Verified' ? 'success' : 'warning'}>
                    {cert.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Rejection Reason Modal */}
      {rejectingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Decline Session Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingAppointment(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">
              Decline session request from <strong>{rejectingAppointment.learnerName}</strong> for <em>"{rejectingAppointment.skillName}"</em>.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reason for Declining (Optional note to student)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Schedule conflict, please book for Thursday after 6 PM."
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingAppointment(null)}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === rejectingAppointment.id}
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {processingId === rejectingAppointment.id ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Complete Details Modal */}
      {viewingDetailsAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Request Details
                </h3>
                <p className="text-xs text-neutral-500">ID: {viewingDetailsAppointment.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetailsAppointment(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                <Avatar
                  name={viewingDetailsAppointment.learnerName}
                  avatarUrl={viewingDetailsAppointment.learnerAvatarUrl}
                  bgColor={viewingDetailsAppointment.learnerAvatarBgColor || '#0284c7'}
                  size="md"
                />
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Student</span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">
                    {viewingDetailsAppointment.learnerName}
                  </span>
                  {viewingDetailsAppointment.learnerHeadline && (
                    <p className="text-[11px] text-neutral-500">{viewingDetailsAppointment.learnerHeadline}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Requested Skill</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {viewingDetailsAppointment.skillName}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Session Mode</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {viewingDetailsAppointment.isFreeSwap ? 'Free Skill Swap ($0)' : `$${viewingDetailsAppointment.totalCost} USD Paid Lesson`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Scheduled Date & Time</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {viewingDetailsAppointment.requestedDate} at {viewingDetailsAppointment.startTime} ({viewingDetailsAppointment.durationMinutes}m)
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Status</span>
                  <Badge variant={viewingDetailsAppointment.status === 'Accepted' ? 'success' : viewingDetailsAppointment.status === 'Pending' ? 'warning' : 'error'}>
                    {viewingDetailsAppointment.status}
                  </Badge>
                </div>
              </div>

              {viewingDetailsAppointment.isFreeSwap && viewingDetailsAppointment.offeredSwapSkillName && (
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-sky-50/40 dark:bg-sky-950/20">
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-semibold block">Reciprocal Skill Offered</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {viewingDetailsAppointment.offeredSwapSkillName}
                  </span>
                </div>
              )}

              {viewingDetailsAppointment.message && (
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">Student Notes / Goals</span>
                  <p className="italic text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    &ldquo;{viewingDetailsAppointment.message}&rdquo;
                  </p>
                </div>
              )}

              {viewingDetailsAppointment.rejectionReason && (
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
                  <span className="text-[10px] uppercase font-semibold block mb-1">Decline Reason</span>
                  <p>{viewingDetailsAppointment.rejectionReason}</p>
                </div>
              )}

              <p className="text-[11px] text-neutral-400">
                Created: {new Date(viewingDetailsAppointment.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingDetailsAppointment(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
              {viewingDetailsAppointment.status === 'Pending' && (
                <>
                  <button
                    type="button"
                    disabled={processingId === viewingDetailsAppointment.id}
                    onClick={async () => {
                      await handleAccept(viewingDetailsAppointment.id);
                      setViewingDetailsAppointment(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Accept Request
                  </button>
                  <button
                    type="button"
                    disabled={processingId === viewingDetailsAppointment.id}
                    onClick={() => {
                      const target = viewingDetailsAppointment;
                      setViewingDetailsAppointment(null);
                      setRejectingAppointment(target);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
