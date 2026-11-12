/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import {
  CheckCircle2,
  XCircle,
  Award,
  BookOpen,
  FileText,
  UserCheck,
  Check,
  X,
  Clock,
} from 'lucide-react';

export const AdminVerificationsView: React.FC = () => {
  const {
    users,
    updateCertificateStatus,
    toggleUserVerification,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'certificates' | 'skills' | 'profiles'>('certificates');
  const [rejectingCertId, setRejectingCertId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Extract pending certificates across all users
  const pendingCertificates = users.flatMap((u) =>
    u.certificates
      .filter((c) => c.status === 'Pending')
      .map((c) => ({ ...c, ownerName: u.name, ownerEmail: u.email }))
  );

  // Extract pending skills across all users
  const pendingSkills = users.flatMap((u) =>
    u.teachingSkills
      .filter((s) => s.verificationStatus === 'Pending')
      .map((s) => ({ ...s, ownerName: u.name, ownerEmail: u.email, ownerId: u.id }))
  );

  // Unverified profiles with high completeness
  const unverifiedProfiles = users.filter((u) => !u.isProfileVerified && !u.isSuspended);

  const handleApproveCert = (certId: string) => {
    updateCertificateStatus(certId, 'Verified');
  };

  const handleRejectCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCertId || !rejectionReason.trim()) return;
    updateCertificateStatus(rejectingCertId, 'Rejected', rejectionReason.trim());
    setRejectingCertId(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Verification & Accreditation Center
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Review community credential submissions, assess instructor syllabus criteria, and award verified badges.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'certificates'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Certificates Queue ({pendingCertificates.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'skills'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Skill Syllabi Queue ({pendingSkills.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'profiles'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Profile Verification ({unverifiedProfiles.length})</span>
        </button>
      </div>

      {/* Certificate Queue */}
      {activeTab === 'certificates' && (
        <div className="space-y-3.5">
          {pendingCertificates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              No pending certificate submissions. All reviewed!
            </div>
          ) : (
            pendingCertificates.map((cert) => (
              <div
                key={cert.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>Submitted by: <strong>{cert.ownerName}</strong> ({cert.ownerEmail})</span>
                    <span>·</span>
                    <span>{new Date(cert.submittedAt).toLocaleDateString()}</span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                    {cert.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    <span>Issuing Org: <strong>{cert.issuingOrganization}</strong></span>
                    <span>·</span>
                    <span>Related Skill: <strong>{cert.relatedSkill}</strong></span>
                  </div>

                  {cert.fileName && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 mt-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-mono text-[11px] underline">
                        Simulated Document: {cert.fileName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => handleApproveCert(cert.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => setRejectingCertId(cert.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Skills Queue */}
      {activeTab === 'skills' && (
        <div className="space-y-3.5">
          {pendingSkills.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              No pending skill curricula in queue.
            </div>
          ) : (
            pendingSkills.map((sk) => (
              <div
                key={sk.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>Instructor: <strong>{sk.ownerName}</strong> ({sk.ownerEmail})</span>
                    <span>·</span>
                    <span>Category: {sk.category}</span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                    {sk.name} ({sk.proficiency} · {sk.yearsExperience} yrs exp)
                  </h3>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                    {sk.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      addToast('success', 'Skill Verified', `Approved "${sk.name}" for ${sk.ownerName}.`);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Skill</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Profiles Queue */}
      {activeTab === 'profiles' && (
        <div className="space-y-3.5">
          {unverifiedProfiles.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-4"
            >
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  {p.name}
                </h4>
                <p className="text-[11px] text-neutral-500">
                  {p.email} · {p.location} · {p.teachingSkills.length} teaching skills
                </p>
              </div>

              <button
                onClick={() => toggleUserVerification(p.id)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Grant Verified Badge</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal with Reason */}
      {rejectingCertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Reject Certificate Submission
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Provide feedback to the instructor so they can resubmit valid credential proof.
            </p>

            <form onSubmit={handleRejectCertSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Document image is illegible, issuing organization verification URL invalid..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingCertId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
