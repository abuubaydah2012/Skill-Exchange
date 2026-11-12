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
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const {
    currentUser,
    appointments,
    classes,
    reviews,
    updateAppointmentStatus,
  } = useApp();
  const navigate = useNavigate();

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

  // Teaching skills count & verification
  const totalSkills = currentUser.teachingSkills.length;
  const verifiedSkillsCount = currentUser.teachingSkills.filter(
    (s) => s.verificationStatus === 'Verified'
  ).length;

  return (
    <div className="space-y-6">
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
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>{req.requestedDate}</span>
                        <span>·</span>
                        <span>{req.startTime} ({req.durationMinutes}m)</span>
                        <span>·</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {req.isFreeSwap ? 'Free Skill Swap' : `$${req.totalCost} USD`}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white mt-1">
                        {req.skillName}
                      </h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Student: <strong>{req.learnerName}</strong>
                        {req.isFreeSwap && req.offeredSwapSkillName && (
                          <span> (Offering: {req.offeredSwapSkillName})</span>
                        )}
                      </p>
                      {req.message && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 italic mt-1 bg-white dark:bg-neutral-900 p-2 rounded border border-neutral-200 dark:border-neutral-800">
                          &ldquo;{req.message}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateAppointmentStatus(req.id, 'Accepted')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(req.id, 'Rejected')}
                        className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
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

                    <button
                      onClick={() => navigate('/appointments')}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Details
                    </button>
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
    </div>
  );
};
