/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Video,
  List,
  Calendar,
  DollarSign,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';

export const AppointmentsView: React.FC = () => {
  const { currentUser, appointments, updateAppointmentStatus, refreshAppointments } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [rejectingAppointmentId, setRejectingAppointmentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [selectedDetailsAppointment, setSelectedDetailsAppointment] = useState<Appointment | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  if (!currentUser) return null;

  // Filter appointments involving current user
  const userAppointments = appointments.filter(
    (a) => a.learnerId === currentUser.id || a.teacherId === currentUser.id
  );

  const filteredAppointments = userAppointments.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const handleAccept = async (id: string) => {
    try {
      setProcessingId(id);
      await updateAppointmentStatus(id, 'Accepted');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppointmentId) return;
    try {
      setProcessingId(cancellingAppointmentId);
      await updateAppointmentStatus(cancellingAppointmentId, 'Cancelled', cancellationReason.trim());
      setCancellingAppointmentId(null);
      setCancellationReason('');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAppointmentId) return;
    try {
      setProcessingId(rejectingAppointmentId);
      await updateAppointmentStatus(rejectingAppointmentId, 'Rejected', rejectionReason.trim());
      setRejectingAppointmentId(null);
      setRejectionReason('');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending Confirmation</Badge>;
      case 'Completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'Cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      case 'Rejected':
        return <Badge variant="error">Declined</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            1-on-1 Appointments & Swap Requests
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your personal mentorship schedule, swap exchanges, and incoming requests.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List View</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['all', 'Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === st
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {st === 'all' ? 'All Appointments' : st}
          </button>
        ))}
      </div>

      {/* View Mode: List or Calendar */}
      {viewMode === 'list' ? (
        <div className="space-y-3.5">
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <CalendarDays className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                No appointments found
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                You currently have no appointments matching this status filter.
              </p>
            </div>
          ) : (
            filteredAppointments.map((apt) => {
              const isTeacher = currentUser.id === apt.teacherId;
              const otherPartyName = isTeacher ? apt.learnerName : apt.teacherName;
              const otherAvatar = isTeacher ? apt.learnerAvatarUrl : apt.teacherAvatarUrl;
              const otherBgColor = isTeacher
                ? apt.learnerAvatarBgColor || '#0284c7'
                : apt.teacherAvatarBgColor || '#059669';
              const roleTitle = isTeacher ? 'Student' : 'Instructor';

              return (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <Avatar
                      name={otherPartyName}
                      avatarUrl={otherAvatar}
                      bgColor={otherBgColor}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {apt.requestedDate}
                        </span>
                        <span>·</span>
                        <span>{apt.startTime} ({apt.durationMinutes} mins)</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          {apt.isFreeSwap ? (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              <span>Free Skill Swap</span>
                            </>
                          ) : (
                            <span>${apt.totalCost} USD Paid Lesson</span>
                          )}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                        {apt.skillName}
                      </h3>

                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {roleTitle}: <strong>{otherPartyName}</strong>
                        {apt.isFreeSwap && apt.offeredSwapSkillName && (
                          <span> · Exchange topic: {apt.offeredSwapSkillName}</span>
                        )}
                      </p>

                      {apt.message && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 italic mt-2 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                          &ldquo;{apt.message}&rdquo;
                        </p>
                      )}

                      {apt.status === 'Rejected' && (apt.rejectionReason || apt.cancellationReason) && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-900">
                          Decline reason: {apt.rejectionReason || apt.cancellationReason}
                        </p>
                      )}

                      {apt.status === 'Cancelled' && apt.cancellationReason && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 font-medium">
                          Cancellation note: {apt.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
                    <div>{getStatusBadge(apt.status)}</div>

                    <button
                      type="button"
                      onClick={() => setSelectedDetailsAppointment(apt)}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    {/* Pending actions for teacher */}
                    {apt.status === 'Pending' && isTeacher && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === apt.id}
                          onClick={() => handleAccept(apt.id)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{processingId === apt.id ? 'Accepting...' : 'Accept'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingId === apt.id}
                          onClick={() => {
                            setRejectingAppointmentId(apt.id);
                            setRejectionReason('');
                          }}
                          className="px-3.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {/* Cancel action for active appointments */}
                    {(apt.status === 'Pending' || apt.status === 'Accepted') && (
                      <button
                        type="button"
                        onClick={() => setCancellingAppointmentId(apt.id)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Mark completed */}
                    {apt.status === 'Accepted' && (
                      <button
                        type="button"
                        disabled={processingId === apt.id}
                        onClick={() => updateAppointmentStatus(apt.id, 'Completed')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Calendar Schedule Grid */
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Upcoming Schedule Matrix (7-Day Horizon)
            </h3>
            <span className="text-xs text-neutral-500">
              {filteredAppointments.filter((a) => a.status === 'Accepted').length} Confirmed Sessions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() + dayIdx);
              const dateStr = targetDate.toISOString().split('T')[0];
              const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = targetDate.getDate();

              const dayApts = filteredAppointments.filter((a) => a.requestedDate === dateStr);

              return (
                <div
                  key={dateStr}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 flex flex-col min-h-[140px]"
                >
                  <div className="flex items-center justify-between text-xs font-semibold pb-2 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="text-neutral-500">{dayName}</span>
                    <span className="text-neutral-900 dark:text-white font-mono">{dayNum}</span>
                  </div>

                  <div className="mt-2 space-y-1.5 flex-1">
                    {dayApts.length === 0 ? (
                      <span className="text-[10px] text-neutral-400 italic block pt-2 text-center">
                        Free Slot
                      </span>
                    ) : (
                      dayApts.map((a) => (
                        <div
                          key={a.id}
                          className="p-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[10px]"
                        >
                          <span className="font-bold text-neutral-900 dark:text-white block truncate">
                            {a.startTime} {a.skillName}
                          </span>
                          <span className="text-neutral-500 truncate block">
                            {currentUser.id === a.teacherId ? a.learnerName : a.teacherName}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancellingAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Cancel Appointment
                </h3>
              </div>
              <button
                onClick={() => setCancellingAppointmentId(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              Please let your peer know the reason for cancellation so they can reschedule appropriately.
            </p>

            <form onSubmit={handleCancelSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Sudden scheduling conflict, work emergency, or health..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingAppointmentId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {rejectingAppointmentId && (
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
                onClick={() => setRejectingAppointmentId(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">
              Are you sure you want to decline this request? You may provide an optional reason for the student.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason for Declining (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, please request another time..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingAppointmentId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingAppointmentId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {processingId === rejectingAppointmentId ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Complete Details Modal */}
      {selectedDetailsAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Appointment Details
                </h3>
                <p className="text-xs text-neutral-500">ID: {selectedDetailsAppointment.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailsAppointment(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 flex items-center gap-2.5">
                  <Avatar
                    name={selectedDetailsAppointment.learnerName}
                    avatarUrl={selectedDetailsAppointment.learnerAvatarUrl}
                    bgColor={selectedDetailsAppointment.learnerAvatarBgColor || '#0284c7'}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Student</span>
                    <span className="font-bold text-neutral-900 dark:text-white truncate block">
                      {selectedDetailsAppointment.learnerName}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 flex items-center gap-2.5">
                  <Avatar
                    name={selectedDetailsAppointment.teacherName}
                    avatarUrl={selectedDetailsAppointment.teacherAvatarUrl}
                    bgColor={selectedDetailsAppointment.teacherAvatarBgColor || '#059669'}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Instructor</span>
                    <span className="font-bold text-neutral-900 dark:text-white truncate block">
                      {selectedDetailsAppointment.teacherName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Requested Skill</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedDetailsAppointment.skillName}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Session Mode</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedDetailsAppointment.isFreeSwap ? 'Free Skill Swap ($0)' : `$${selectedDetailsAppointment.totalCost} USD Paid Lesson`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Scheduled Date & Time</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedDetailsAppointment.requestedDate} at {selectedDetailsAppointment.startTime} ({selectedDetailsAppointment.durationMinutes}m)
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Status</span>
                  <div>{getStatusBadge(selectedDetailsAppointment.status)}</div>
                </div>
              </div>

              {selectedDetailsAppointment.isFreeSwap && selectedDetailsAppointment.offeredSwapSkillName && (
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-sky-50/40 dark:bg-sky-950/20">
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-semibold block">Reciprocal Skill Offered</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedDetailsAppointment.offeredSwapSkillName}
                  </span>
                </div>
              )}

              {selectedDetailsAppointment.message && (
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">Student Notes / Goals</span>
                  <p className="italic text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    &ldquo;{selectedDetailsAppointment.message}&rdquo;
                  </p>
                </div>
              )}

              {(selectedDetailsAppointment.rejectionReason || selectedDetailsAppointment.cancellationReason) && (
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
                  <span className="text-[10px] uppercase font-semibold block mb-1">
                    {selectedDetailsAppointment.status === 'Rejected' ? 'Decline Reason' : 'Cancellation Note'}
                  </span>
                  <p>{selectedDetailsAppointment.rejectionReason || selectedDetailsAppointment.cancellationReason}</p>
                </div>
              )}

              <p className="text-[11px] text-neutral-400">
                Created: {new Date(selectedDetailsAppointment.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedDetailsAppointment(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
