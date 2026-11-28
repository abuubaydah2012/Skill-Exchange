/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard } from './StatCard';
import { DashboardSearchResults } from './DashboardSearchResults';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { rankMatchesForUser } from '../../services/matchingAlgorithm';
import { calculateProfileCompleteness } from '../../utils/profileCompleteness';
import {
  CalendarDays,
  Video,
  Sparkles,
  ArrowRight,
  Clock,
  Compass,
  MessageSquare,
  Award,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export const LearnerDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    appointments,
    classes,
    announcements,
    dashboardSearchQuery,
    setDashboardSearchQuery,
    dashboardSearchSubmitCount,
  } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  // Active announcements
  const activeAnnouncements = announcements.filter((a) => a.isActive);

  // User's upcoming sessions (classes enrolled + accepted appointments)
  const userEnrolledClasses = classes.filter(
    (c) => c.enrolledUserIds.includes(currentUser.id) && c.status === 'Scheduled'
  );

  const userAppointments = appointments.filter(
    (a) => a.learnerId === currentUser.id || a.teacherId === currentUser.id
  );

  const pendingRequests = appointments.filter(
    (a) =>
      (a.learnerId === currentUser.id || a.teacherId === currentUser.id) &&
      a.status === 'Pending'
  );

  const acceptedAppointments = appointments.filter(
    (a) =>
      (a.learnerId === currentUser.id || a.teacherId === currentUser.id) &&
      a.status === 'Accepted'
  );

  const mySubmittedRequests = appointments
    .filter((a) => a.learnerId === currentUser.id)
    .slice(0, 6);

  // Matches calculation (used for Mutual Swap Matches KPI)
  const rankedMatches = rankMatchesForUser(currentUser, users);
  const mutualSwaps = rankedMatches.filter((m) => m.isMutualSwap);
  const isSearching = dashboardSearchQuery.trim().length > 0;

  // Profile completeness
  const completeness = calculateProfileCompleteness(currentUser);

  return (
    <div className="space-y-6">
      {/* Identity Verification Status Banner */}
      {currentUser.identityVerification?.status === 'Pending' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-100">
              Identity Verification In Progress
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
              Your <strong>{currentUser.identityVerification.documentType}</strong> ({currentUser.identityVerification.documentNumber}) is currently queued for compliance review. You can continue exploring courses and appointments.
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

      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Welcome back, {currentUser.name.split(' ')[0]}
            </h1>
            {currentUser.isProfileVerified && (
              <span className="text-sky-600 dark:text-sky-400" title="Verified Member">
                <CheckCircle2 className="w-5 h-5 fill-current" />
              </span>
            )}
          </div>

          {/* Profile Completeness Bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 max-w-xs h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">
              {completeness.percentage}% Complete
            </span>
            {completeness.percentage < 100 && (
              <button
                onClick={() => navigate(`/profile/${currentUser.id}`)}
                className="text-xs text-sky-600 dark:text-sky-400 font-medium hover:underline cursor-pointer"
              >
                Complete profile
              </button>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/discover')}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Skills</span>
          </button>
          <button
            onClick={() => navigate('/matches')}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Smart Matches</span>
          </button>
        </div>
      </div>

      {/* Announcements */}
      {activeAnnouncements.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <span>{activeAnnouncements[0].title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                {activeAnnouncements[0].badge}
              </span>
            </div>
            <p className="mt-1 text-amber-800 dark:text-amber-300/90 leading-relaxed">
              {activeAnnouncements[0].content}
            </p>
          </div>
        </div>
      )}

      {/* In-Place Dashboard Search Results or Normal Dashboard Content */}
      {isSearching ? (
        <DashboardSearchResults
          query={dashboardSearchQuery}
          submitCount={dashboardSearchSubmitCount}
          onClear={() => setDashboardSearchQuery('')}
        />
      ) : (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Upcoming Sessions"
              value={userEnrolledClasses.length + acceptedAppointments.length}
              subValue="Classes & 1-on-1s"
              icon={CalendarDays}
            />
            <StatCard
              label="Pending Requests"
              value={pendingRequests.length}
              subValue="Awaiting confirmation"
              icon={Clock}
            />
            <StatCard
              label="Mutual Swap Matches"
              value={mutualSwaps.length}
              subValue="Zero fee exchange"
              icon={Sparkles}
            />
            <StatCard
              label="Completed Lessons"
              value={currentUser.completedSessionsCount}
              subValue={`${currentUser.reviewCount} reviews received`}
              icon={Award}
            />
          </div>

          {/* Full-Width Schedule & Requests Section */}
          <div className="space-y-6">
            {/* Upcoming sessions card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-neutral-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Upcoming Classes & Sessions
                </h2>
              </div>
              <button
                onClick={() => navigate('/classes')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {userEnrolledClasses.length === 0 && acceptedAppointments.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No upcoming sessions booked. Discover free skill swaps or workshops!
                </p>
                <button
                  onClick={() => navigate('/discover')}
                  className="mt-3 px-3.5 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {userEnrolledClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>{cls.category}</span>
                        <span>·</span>
                        <span>{cls.format}</span>
                        <span>·</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {cls.isFree ? 'Free Workshop' : `$${cls.price} USD`}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate mt-0.5">
                        {cls.title}
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Teacher: {cls.teacherName} · Duration: {cls.durationMinutes}m
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => navigate('/classes')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))}

                {acceptedAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>1-on-1 Session</span>
                        <span>·</span>
                        <span>{apt.requestedDate} at {apt.startTime}</span>
                        <span>·</span>
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          {apt.isFreeSwap ? 'Free Skill Swap' : `$${apt.totalCost} USD`}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate mt-0.5">
                        {apt.skillName}
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        With: {currentUser.id === apt.learnerId ? apt.teacherName : apt.learnerName} · {apt.durationMinutes} mins
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
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

          {/* My Submitted Requests & Status Tracking */}
          {mySubmittedRequests.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                    My Lesson & Swap Requests ({mySubmittedRequests.length})
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/appointments')}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  Manage All Requests
                </button>
              </div>

              <div className="space-y-3">
                {mySubmittedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar
                        name={req.teacherName}
                        avatarUrl={req.teacherAvatarUrl}
                        bgColor={req.teacherAvatarBgColor || '#059669'}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <h4 className="font-bold text-neutral-900 dark:text-white truncate">
                            {req.skillName}
                          </h4>
                          <span className="text-neutral-400">·</span>
                          <span className="text-neutral-500 text-[11px]">Instructor: <strong>{req.teacherName}</strong></span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {req.requestedDate} at {req.startTime} ({req.durationMinutes} mins) · {req.isFreeSwap ? 'Free Skill Swap' : `$${req.totalCost} USD`}
                        </p>
                        {req.status === 'Rejected' && req.rejectionReason && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium bg-rose-50/50 dark:bg-rose-950/30 p-1.5 rounded border border-rose-200 dark:border-rose-900">
                            Decline reason: {req.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {req.status === 'Accepted' && <Badge variant="success">Accepted</Badge>}
                      {req.status === 'Pending' && <Badge variant="warning">Awaiting Confirmation</Badge>}
                      {req.status === 'Rejected' && <Badge variant="error">Declined</Badge>}
                      {req.status === 'Completed' && <Badge variant="neutral">Completed</Badge>}
                      {req.status === 'Cancelled' && <Badge variant="error">Cancelled</Badge>}
                      <button
                        onClick={() => navigate('/appointments')}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
};
