/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard } from './StatCard';
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
} from 'lucide-react';

export const LearnerDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    appointments,
    classes,
    announcements,
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

  // Matches calculation
  const rankedMatches = rankMatchesForUser(currentUser, users);
  const mutualSwaps = rankedMatches.filter((m) => m.isMutualSwap);
  const topMatches = rankedMatches.slice(0, 4);

  // Profile completeness
  const completeness = calculateProfileCompleteness(currentUser);

  return (
    <div className="space-y-6">
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
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
            You are offering <strong className="text-neutral-800 dark:text-neutral-200">{currentUser.teachingSkills.length} teaching skills</strong> and looking to learn <strong className="text-neutral-800 dark:text-neutral-200">{currentUser.learningInterests.join(', ') || 'new skills'}</strong>.
          </p>

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

      {/* Split Section: Upcoming Schedule vs Mutual Swap Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Sessions & Requests */}
        <div className="lg:col-span-2 space-y-6">
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
                  className="mt-3 px-3.5 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
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
                        className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Appointment Requests */}
          {pendingRequests.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Pending Requests ({pendingRequests.length})
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/appointments')}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  Manage Requests
                </button>
              </div>

              <div className="space-y-2.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
                        {req.skillName}
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        {req.requestedDate} · {req.startTime} ({req.durationMinutes} mins)
                      </p>
                    </div>
                    <Badge variant="warning">Awaiting Response</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Top Recommended Matches */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Top Recommended Matches
                </h2>
              </div>
              <button
                onClick={() => navigate('/matches')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
              >
                All Matches
              </button>
            </div>

            <div className="space-y-3.5">
              {topMatches.map((match) => (
                <div
                  key={match.matchedUser.id}
                  className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-950/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={match.matchedUser.name}
                        avatarUrl={match.matchedUser.avatarUrl}
                        bgColor={match.matchedUser.avatarBgColor}
                        size="sm"
                        isVerified={match.matchedUser.isProfileVerified}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                          {match.matchedUser.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 truncate max-w-[140px]">
                          {match.matchedUser.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {match.matchScore}%
                      </span>
                      <span className="text-[10px] text-neutral-400 block">Match</span>
                    </div>
                  </div>

                  {match.isMutualSwap && (
                    <div className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Mutual Skill Swap Opportunity!</span>
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {match.matchReasons[0] || 'Complementary learning profile.'}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                      {match.priceOption}
                    </span>
                    <button
                      onClick={() => navigate(`/profile/${match.matchedUser.id}`)}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
