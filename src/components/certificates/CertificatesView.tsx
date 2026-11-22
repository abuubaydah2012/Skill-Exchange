/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Certificate, CertificateStatus } from '../../types';
import { Badge } from '../common/Badge';
import {
  Award,
  Plus,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Calendar,
  X,
} from 'lucide-react';

export const CertificatesView: React.FC = () => {
  const { currentUser, addCertificate } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [issuingOrg, setIssuingOrg] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [relatedSkill, setRelatedSkill] = useState(
    currentUser?.teachingSkills[0]?.name || 'Web Development'
  );
  const [simulatedFileName, setSimulatedFileName] = useState('');

  if (!currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !issuingOrg.trim() || !issueDate) return;

    addCertificate({
      title: title.trim(),
      issuingOrganization: issuingOrg.trim(),
      issueDate,
      expirationDate: expirationDate || undefined,
      relatedSkill,
      fileName: simulatedFileName || `${title.toLowerCase().replace(/\s+/g, '_')}_cert.pdf`,
    });

    setIsModalOpen(false);
    setTitle('');
    setIssuingOrg('');
    setIssueDate('');
    setExpirationDate('');
    setSimulatedFileName('');
  };

  const certificates = currentUser.certificates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Certificate & Credential Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Verified certificates earn the verified instructor badge and boost student booking confidence by 3.4x.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Credential</span>
        </button>
      </div>

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <Award className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            No credentials submitted yet
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Upload your diplomas, licenses, or professional industry certifications to earn your verified badge.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Submit First Certificate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                    <Award className="w-5 h-5 text-sky-600" />
                  </div>
                  <Badge
                    variant={
                      cert.status === 'Verified'
                        ? 'success'
                        : cert.status === 'Rejected'
                        ? 'error'
                        : 'warning'
                    }
                  >
                    {cert.status}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-3 leading-snug">
                  {cert.title}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Issued by: <strong>{cert.issuingOrganization}</strong>
                </p>

                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1 text-xs text-neutral-500">
                  <div className="flex items-center justify-between">
                    <span>Related Skill:</span>
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {cert.relatedSkill}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Issue Date:</span>
                    <span>{cert.issueDate}</span>
                  </div>
                  {cert.expirationDate && (
                    <div className="flex items-center justify-between">
                      <span>Expires:</span>
                      <span>{cert.expirationDate}</span>
                    </div>
                  )}
                  {cert.fileName && (
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span>Evidence:</span>
                      <span className="font-mono text-sky-600 truncate max-w-[150px]">
                        {cert.fileName}
                      </span>
                    </div>
                  )}
                </div>

                {cert.rejectionReason && (
                  <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                    <strong>Rejection reason:</strong> {cert.rejectionReason}
                  </div>
                )}
              </div>

              {cert.status === 'Rejected' && (
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      setTitle(cert.title);
                      setIssuingOrg(cert.issuingOrganization);
                      setRelatedSkill(cert.relatedSkill);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-center"
                  >
                    Resubmit Updated Evidence
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Submit Credential for Verification
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Credential Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AWS Solutions Architect or DELE C2 Spanish License"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    required
                    value={issuingOrg}
                    onChange={(e) => setIssuingOrg(e.target.value)}
                    placeholder="e.g. Amazon Web Services"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Related Teaching Skill
                  </label>
                  {currentUser.teachingSkills.length > 0 ? (
                    <select
                      value={relatedSkill}
                      onChange={(e) => setRelatedSkill(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    >
                      {currentUser.teachingSkills.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={relatedSkill}
                      onChange={(e) => setRelatedSkill(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Simulated Document Attachment */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Upload PDF or Image Certificate
                </label>
                <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-center bg-neutral-50 dark:bg-neutral-950">
                  <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-1.5" />
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {simulatedFileName || 'Select or drop verification file (PDF, PNG, max 10MB)'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSimulatedFileName(`${title || 'credential'}_proof.pdf`)}
                    className="mt-2 text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                  >
                    Simulate File Selection
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
