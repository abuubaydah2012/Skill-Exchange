/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard } from './StatCard';
import { Badge } from '../common/Badge';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Video,
  ShieldCheck,
  Megaphone,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Award,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    users,
    classes,
    payments,
    complaints,
    reviews,
    announcements,
  } = useApp();
  const navigate = useNavigate();

  // Calculated statistics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.isSuspended).length;
  const teachersCount = users.filter((u) => u.role === 'teacher').length;
  const learnersCount = users.filter((u) => u.role === 'learner').length;

  const upcomingClasses = classes.filter((c) => c.status === 'Scheduled').length;
  const completedSessions = classes.filter((c) => c.status === 'Completed').length;

  // Pending queues
  const pendingCertificates = users.flatMap((u) =>
    u.certificates.filter((c) => c.status === 'Pending').map((c) => ({ ...c, userName: u.name }))
  );

  const pendingSkills = users.flatMap((u) =>
    u.teachingSkills.filter((s) => s.verificationStatus === 'Pending').map((s) => ({ ...s, userName: u.name, userId: u.id }))
  );

  const unverifiedProfiles = users.filter((u) => !u.isProfileVerified && !u.isSuspended);

  const openComplaints = complaints.filter((c) => c.status === 'Submitted' || c.status === 'Under Review');

  const flaggedReviews = reviews.filter((r) => r.isFlagged);

  const totalVolume = payments
    .filter((p) => p.status === 'Completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Admin Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Platform Administration Console
            </h1>
            <Badge variant="accent">Admin Access</Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
            Real-time oversight of credential verifications, dispute resolutions, user governance, and simulated transaction volume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/admin/verifications')}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Review Verifications ({pendingCertificates.length + pendingSkills.length})</span>
          </button>
          <button
            onClick={() => navigate('/admin/complaints')}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Open Complaints ({openComplaints.length})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Registered Users"
          value={totalUsers}
          subValue={`${activeUsers} active · ${totalUsers - activeUsers} suspended`}
          icon={Users}
        />
        <StatCard
          label="Teachers / Learners"
          value={`${teachersCount} / ${learnersCount}`}
          subValue="Community ratio"
          icon={TrendingUp}
        />
        <StatCard
          label="Simulated Volume"
          value={`$${totalVolume.toFixed(2)} USD`}
          subValue={`${payments.length} transactions processed`}
          icon={CreditCard}
        />
        <StatCard
          label="Classes & Sessions"
          value={upcomingClasses + completedSessions}
          subValue={`${upcomingClasses} scheduled · ${completedSessions} completed`}
          icon={Video}
        />
        <StatCard
          label="Pending Credentials"
          value={pendingCertificates.length}
          subValue="Awaiting certificate check"
          icon={Award}
        />
        <StatCard
          label="Pending Skill Verifications"
          value={pendingSkills.length}
          subValue="Instructor syllabus checks"
          icon={FileCheck}
        />
        <StatCard
          label="Open Incidents & Reports"
          value={openComplaints.length}
          subValue="Trust & Safety cases"
          icon={AlertTriangle}
        />
        <StatCard
          label="Flagged Reviews"
          value={flaggedReviews.length}
          subValue="Community moderation queue"
          icon={ShieldCheck}
        />
      </div>

      {/* Admin Action Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Queue Preview */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Pending Verification Queue
              </h2>
            </div>
            <button
              onClick={() => navigate('/admin/verifications')}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingCertificates.length === 0 && pendingSkills.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              All credentials and skills are up to date!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] uppercase font-semibold text-sky-600 dark:text-sky-400 block">
                      Certificate Credential
                    </span>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {cert.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 truncate">
                      User: {cert.userName} · Org: {cert.issuingOrganization}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/admin/verifications')}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))}

              {pendingSkills.map((sk) => (
                <div
                  key={sk.id}
                  className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 block">
                      Skill Repertoire
                    </span>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {sk.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 truncate">
                      Instructor: {sk.userName} · Category: {sk.category}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/admin/verifications')}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Complaints & Incident Reports */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Recent Trust & Safety Incidents
              </h2>
            </div>
            <button
              onClick={() => navigate('/admin/complaints')}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {complaints.slice(0, 3).map((cmp) => (
              <div
                key={cmp.id}
                className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    {cmp.category}
                  </span>
                  <Badge variant={cmp.status === 'Resolved' ? 'success' : 'warning'}>
                    {cmp.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                  {cmp.description}
                </p>
                <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between">
                  <span>Reporter: {cmp.reporterName} → Reported: {cmp.reportedUserName}</span>
                  <span>{new Date(cmp.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
