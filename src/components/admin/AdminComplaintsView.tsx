/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Complaint, ComplaintStatus } from '../../types';
import { Badge } from '../common/Badge';
import {
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ShieldAlert,
  Lock,
} from 'lucide-react';

export const AdminComplaintsView: React.FC = () => {
  const { complaints, resolveComplaint, toggleUserSuspension } = useApp();

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    complaints[0] || null
  );
  const [adminResponse, setAdminResponse] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [status, setStatus] = useState<ComplaintStatus>('Resolved');

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !adminResponse.trim()) return;

    resolveComplaint(
      selectedComplaint.id,
      adminResponse.trim(),
      internalNotes.trim(),
      status
    );

    // Update local selected state
    setSelectedComplaint({
      ...selectedComplaint,
      adminResponse: adminResponse.trim(),
      adminInternalNotes: internalNotes.trim(),
      status,
      resolvedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Trust & Safety Incident Resolution
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Review community dispute logs, investigate evidence, store internal audit notes, and dispatch official rulings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complaint Cases List */}
        <div className="space-y-3 lg:col-span-1">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
            Incident Queue ({complaints.length})
          </span>

          <div className="space-y-2.5">
            {complaints.map((c) => {
              const isSelected = selectedComplaint?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedComplaint(c);
                    setAdminResponse(c.adminResponse || '');
                    setInternalNotes(c.adminInternalNotes || '');
                    setStatus(c.status);
                  }}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-neutral-900 border-neutral-900 dark:border-white shadow-xs'
                      : 'bg-white/60 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {c.category}
                    </span>
                    <Badge variant={c.status === 'Resolved' ? 'success' : 'warning'}>
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-1">
                    {c.description}
                  </p>
                  <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between">
                    <span>{c.reporterName} → {c.reportedUserName}</span>
                    <span>{new Date(c.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Detailed Resolution Workspace */}
        {selectedComplaint ? (
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Incident Case #{selectedComplaint.id}
                  </h3>
                  <Badge variant={selectedComplaint.status === 'Resolved' ? 'success' : 'warning'}>
                    {selectedComplaint.status}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Category: <strong>{selectedComplaint.category}</strong> · Submitted on{' '}
                  {new Date(selectedComplaint.submittedAt).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => toggleUserSuspension(selectedComplaint.reportedUserId)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
              >
                Suspend Reported User
              </button>
            </div>

            {/* Case Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                  Reporting Member
                </span>
                <strong className="text-neutral-900 dark:text-white block mt-0.5">
                  {selectedComplaint.reporterName}
                </strong>
                <span className="text-neutral-500">ID: {selectedComplaint.reporterId}</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                  Reported Member
                </span>
                <strong className="text-neutral-900 dark:text-white block mt-0.5">
                  {selectedComplaint.reportedUserName}
                </strong>
                <span className="text-neutral-500">ID: {selectedComplaint.reportedUserId}</span>
              </div>
            </div>

            {/* Statement and evidence */}
            <div>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Complainant Incident Statement:
              </span>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>

            {selectedComplaint.evidenceFileName && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center gap-2 text-xs text-sky-600">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Evidence File: <strong>{selectedComplaint.evidenceFileName}</strong></span>
              </div>
            )}

            {/* Resolution Form */}
            <form onSubmit={handleResolve} className="space-y-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              {/* Internal Notes (Hidden from user!) */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <label className="font-semibold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Internal Admin Notes (Strictly Hidden from Normal Users)</span>
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record internal findings, system logs verified, or risk evaluations..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              {/* Official Response to Complainant */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Official Response to Reporting Member
                </label>
                <textarea
                  required
                  rows={3}
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Official ruling message that will be delivered to the complainant..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Status:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs"
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Rejected">Rejected / Dismissed</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Save Ruling & Dispatch
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-xs text-neutral-500">
            Select a complaint case on the left to examine evidence and formulate rulings.
          </div>
        )}
      </div>
    </div>
  );
};
