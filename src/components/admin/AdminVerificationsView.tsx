/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { UserProfile } from '../../types';
import { formatFileSize } from '../../utils/ageVerification';
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
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Eye,
  Download,
  AlertCircle,
  ExternalLink,
  Filter,
} from 'lucide-react';

export const AdminVerificationsView: React.FC = () => {
  const {
    users,
    updateCertificateStatus,
    toggleUserVerification,
    reviewIdentityVerification,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'identity' | 'certificates' | 'skills' | 'profiles'>('identity');

  // Identity Verification State
  const [identityFilter, setIdentityFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [selectedDocUser, setSelectedDocUser] = useState<UserProfile | null>(null);
  const [rejectingIdentityUserId, setRejectingIdentityUserId] = useState<string | null>(null);
  const [identityRejectionReason, setIdentityRejectionReason] = useState('');

  // Certificate Verification State
  const [rejectingCertId, setRejectingCertId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Extract identity submissions
  const allIdentitySubmissions = users.filter((u) => u.identityVerification);
  const pendingIdentities = allIdentitySubmissions.filter(
    (u) => u.identityVerification?.status === 'Pending'
  );

  const filteredIdentities = allIdentitySubmissions.filter((u) => {
    if (identityFilter === 'pending') return u.identityVerification?.status === 'Pending';
    if (identityFilter === 'verified') return u.identityVerification?.status === 'Verified';
    if (identityFilter === 'rejected') return u.identityVerification?.status === 'Rejected';
    return true;
  });

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

  // Handle Identity Approval
  const handleApproveIdentity = (userId: string) => {
    reviewIdentityVerification(userId, 'Verified');
  };

  // Handle Identity Rejection Submit
  const handleRejectIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingIdentityUserId || !identityRejectionReason.trim()) return;
    reviewIdentityVerification(rejectingIdentityUserId, 'Rejected', identityRejectionReason.trim());
    setRejectingIdentityUserId(null);
    setIdentityRejectionReason('');
  };

  // Handle Certificate Approval
  const handleApproveCert = (certId: string) => {
    updateCertificateStatus(certId, 'Verified');
  };

  // Handle Certificate Rejection Submit
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
          Review government identity documents (NID / Birth Certificate), credential submissions, and award verified badges.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        {/* Tab 1: Identity Documents */}
        <button
          onClick={() => setActiveTab('identity')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'identity'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Identity Documents ({pendingIdentities.length})</span>
        </button>

        {/* Tab 2: Certificates Queue */}
        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'certificates'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>Certificates Queue ({pendingCertificates.length})</span>
        </button>

        {/* Tab 3: Skill Syllabi */}
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'skills'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 text-sky-500" />
          <span>Skill Syllabi Queue ({pendingSkills.length})</span>
        </button>

        {/* Tab 4: Profile Verification */}
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'profiles'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-500" />
          <span>Profile Verification ({unverifiedProfiles.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: IDENTITY VERIFICATION QUEUE */}
      {/* ============================================================== */}
      {activeTab === 'identity' && (
        <div className="space-y-4">
          {/* Sub-filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Submissions:</span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['pending', 'all', 'verified', 'rejected'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setIdentityFilter(filterKey)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                    identityFilter === filterKey
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {filterKey}
                  {filterKey === 'pending' && ` (${pendingIdentities.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* List of Identity Submissions */}
          {filteredIdentities.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              No identity verification submissions matching &quot;{identityFilter}&quot; filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIdentities.map((user) => {
                const idRec = user.identityVerification;
                if (!idRec) return null;

                const isAdult = (user.age || 0) >= 18;
                const isNid = idRec.documentType === 'National ID (NID)';
                const isAgeCompliant = (isAdult && isNid) || (!isAdult && !isNid);

                return (
                  <div
                    key={user.id}
                    className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4"
                  >
                    {/* User and Status Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={user.name}
                          avatarUrl={user.avatarUrl}
                          bgColor={user.avatarBgColor}
                          size="md"
                          isVerified={user.isProfileVerified}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                              {user.name}
                            </h3>
                            <Badge variant={user.role === 'teacher' ? 'success' : 'neutral'}>
                              {user.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {user.email} · {user.phoneNumber || 'No phone'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            idRec.status === 'Verified'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : idRec.status === 'Rejected'
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {idRec.status === 'Pending' ? 'Pending Review' : idRec.status}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(idRec.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Age and Document Criteria Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                          Date of Birth
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block">
                          {user.dateOfBirth || 'Not provided'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                          Calculated Age
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {user.age ?? '—'} yrs
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isAdult
                                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                                : 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200'
                            }`}
                          >
                            {isAdult ? 'Adult (18+)' : 'Minor (<18)'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                          Document Type
                        </span>
                        <span className="font-bold text-neutral-900 dark:text-white mt-0.5 block">
                          {idRec.documentType}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                          Document Number
                        </span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5 block truncate">
                          {idRec.documentNumber}
                        </span>
                      </div>
                    </div>

                    {/* Age Compliance Validation Pill */}
                    <div className="flex items-center gap-2 text-xs">
                      {isAgeCompliant ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Age Compliance Verified: {isAdult ? 'Adult submitted National ID (NID)' : 'Minor submitted Birth Certificate'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            Age Mismatch Warning: {isAdult ? 'Adult must submit National ID' : 'Minor must submit Birth Certificate'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Attached PDF & Document Preview Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                            {idRec.documentFileName}
                          </p>
                          <span className="text-[10px] text-neutral-400">
                            {formatFileSize(idRec.documentFileSize || 350000)} · PDF Document
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDocUser(user)}
                          className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Document</span>
                        </button>

                        {idRec.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveIdentity(user.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingIdentityUserId(user.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Display Rejection Reason if rejected */}
                    {idRec.status === 'Rejected' && idRec.rejectionReason && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                        <span className="font-bold">Rejection Reason: </span>
                        <span>{idRec.rejectionReason}</span>
                      </div>
                    )}

                    {/* Display Uploaded Certificates count if any */}
                    {user.certificates.length > 0 && (
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 text-xs text-neutral-500">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {user.certificates.length} Certificate(s) uploaded during registration ({user.certificates.map(c => c.title).join(', ')})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CERTIFICATES QUEUE */}
      {/* ============================================================== */}
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
                        Document: {cert.fileName}
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

      {/* ============================================================== */}
      {/* TAB 3: SKILLS QUEUE */}
      {/* ============================================================== */}
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

      {/* ============================================================== */}
      {/* TAB 4: PROFILES QUEUE */}
      {/* ============================================================== */}
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

      {/* ============================================================== */}
      {/* MODAL 1: DOCUMENT PREVIEW MODAL */}
      {/* ============================================================== */}
      {selectedDocUser && selectedDocUser.identityVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Identity Document Review
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {selectedDocUser.identityVerification.documentType} · {selectedDocUser.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocUser(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Owner</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedDocUser.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Age / DOB</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {selectedDocUser.age} yrs ({selectedDocUser.dateOfBirth})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Document No.</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white truncate block">
                  {selectedDocUser.identityVerification.documentNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">File Name</span>
                <span className="font-mono text-neutral-900 dark:text-white truncate block">
                  {selectedDocUser.identityVerification.documentFileName}
                </span>
              </div>
            </div>

            {/* Document Display / Preview Card */}
            <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
              {selectedDocUser.identityVerification.documentUrl &&
              selectedDocUser.identityVerification.documentUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={selectedDocUser.identityVerification.documentUrl}
                  title="PDF Document Preview"
                  className="w-full h-80 rounded-lg border border-neutral-300 dark:border-neutral-800"
                />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-md">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {selectedDocUser.identityVerification.documentFileName}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {selectedDocUser.identityVerification.documentType} ({formatFileSize(selectedDocUser.identityVerification.documentFileSize)})
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    {selectedDocUser.identityVerification.documentUrl && (
                      <a
                        href={selectedDocUser.identityVerification.documentUrl}
                        download={selectedDocUser.identityVerification.documentFileName}
                        className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Original PDF</span>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Review Decision Buttons in Modal */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-500">
                Submitted on {new Date(selectedDocUser.identityVerification.submittedAt).toLocaleString()}
              </span>

              <div className="flex items-center gap-2">
                {selectedDocUser.identityVerification.status === 'Pending' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const uid = selectedDocUser.id;
                        setSelectedDocUser(null);
                        setRejectingIdentityUserId(uid);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                    >
                      Reject Submission
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApproveIdentity(selectedDocUser.id);
                        setSelectedDocUser(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Approve & Verify Member
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedDocUser(null)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-800 rounded-lg"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: IDENTITY REJECTION WITH REASON */}
      {/* ============================================================== */}
      {rejectingIdentityUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Reject Identity Verification
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Provide feedback to the member explaining why their document was rejected so they can re-upload a compliant PDF.
            </p>

            <form onSubmit={handleRejectIdentitySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={identityRejectionReason}
                  onChange={(e) => setIdentityRejectionReason(e.target.value)}
                  placeholder="e.g. Scanned document is blurry and unreadable, identity number does not match record, incorrect document type..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingIdentityUserId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
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

      {/* ============================================================== */}
      {/* MODAL 3: CERTIFICATE REJECTION WITH REASON */}
      {/* ============================================================== */}
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
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
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
