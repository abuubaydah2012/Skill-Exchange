/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ComplaintCategory, ComplaintStatus } from '../../types';
import { Badge } from '../common/Badge';
import {
  AlertTriangle,
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  X,
} from 'lucide-react';

export const ComplaintsView: React.FC = () => {
  const { currentUser, users, complaints, submitComplaint } = useApp();
  const [searchParams] = useSearchParams();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reportedUserId, setReportedUserId] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('Inappropriate Content');
  const [description, setDescription] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');

  // Check if query has targetUser
  useEffect(() => {
    const target = searchParams.get('targetUser');
    if (target) {
      setReportedUserId(target);
      setIsSubmitModalOpen(true);
    }
  }, [searchParams]);

  if (!currentUser) return null;

  // Complaints submitted by this user
  const userComplaints = complaints.filter((c) => c.reporterId === currentUser.id);

  // Available users to report (excluding self)
  const reportableUsers = users.filter((u) => u.id !== currentUser.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find((u) => u.id === reportedUserId);
    if (!targetUser || !description.trim()) return;

    submitComplaint({
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reportedUserId: targetUser.id,
      reportedUserName: targetUser.name,
      category,
      description: description.trim(),
      evidenceFileName: evidenceFileName || undefined,
    });

    setIsSubmitModalOpen(false);
    setDescription('');
    setEvidenceFileName('');
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Resolved':
        return <Badge variant="success">Case Resolved</Badge>;
      case 'Rejected':
        return <Badge variant="error">Dismissed</Badge>;
      case 'Under Review':
        return <Badge variant="warning">Under Review</Badge>;
      default:
        return <Badge variant="info">Submitted</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Reports & Trust Assistance
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            File incident reports for harassment, no-shows, or policy violations and track official moderation resolutions.
          </p>
        </div>

        <button
          onClick={() => {
            if (reportableUsers.length > 0 && !reportedUserId) {
              setReportedUserId(reportableUsers[0].id);
            }
            setIsSubmitModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>File Incident Report</span>
        </button>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        {userComplaints.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <ShieldAlert className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              No reports filed
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              You haven&apos;t filed any community conduct complaints. Our platform maintains zero tolerance for harassment and fraud.
            </p>
          </div>
        ) : (
          userComplaints.map((cmp) => (
            <div
              key={cmp.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {cmp.category}
                    </span>
                    <span className="text-neutral-400 text-xs">·</span>
                    <span className="text-xs text-neutral-500">
                      Reported: <strong>{cmp.reportedUserName}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">
                    Case #{cmp.id} · Submitted {new Date(cmp.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>{getStatusBadge(cmp.status)}</div>
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 leading-relaxed">
                {cmp.description}
              </p>

              {/* Evidence */}
              {cmp.evidenceFileName && (
                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Evidence: <strong className="font-mono">{cmp.evidenceFileName}</strong></span>
                </div>
              )}

              {/* Official Moderator Response (Only public response, internal notes are withheld!) */}
              {cmp.adminResponse ? (
                <div className="mt-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-300">
                  <strong className="block font-semibold mb-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Moderator Response:</span>
                  </strong>
                  <p className="leading-relaxed">{cmp.adminResponse}</p>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-400 italic">
                  Awaiting review by the Trust & Safety team. You will be notified once resolved.
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* File Report Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  File Incident Report
                </h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reported User
                </label>
                <select
                  required
                  value={reportedUserId}
                  onChange={(e) => setReportedUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {reportableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.headline || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Violation Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  <option value="Inappropriate Content">Inappropriate Content</option>
                  <option value="Harassment">Harassment</option>
                  <option value="No-Show">Instructor or Learner No-Show</option>
                  <option value="Fraud / Payment Issue">Fraud / Payment Issue</option>
                  <option value="Poor Quality">Misleading Credentials / Poor Quality</option>
                  <option value="Other">Other Conduct Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Incident Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide concrete details of the incident: dates, messages, or actions that took place..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Attach Evidence (Optional)
                </label>
                <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-3 text-center bg-neutral-50 dark:bg-neutral-950">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {evidenceFileName || 'Attach screenshots or chat exports'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEvidenceFileName('incident_chat_evidence.png')}
                    className="mt-1 text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                  >
                    Simulate Screenshot Attachment
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Submit Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
