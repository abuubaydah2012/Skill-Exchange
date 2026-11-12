/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Review } from '../../types';
import { StarRating } from '../common/StarRating';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import {
  Star,
  Plus,
  Trophy,
  MessageSquare,
  ShieldAlert,
  Edit2,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';

export const ReviewsView: React.FC = () => {
  const {
    currentUser,
    users,
    reviews,
    classes,
    appointments,
    submitReview,
    editReview,
    flagReview,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'received' | 'written' | 'leaderboard'>('received');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // Review Form State
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Flag Review State
  const [flaggingReviewId, setFlaggingReviewId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');

  if (!currentUser) return null;

  // Reviews received by current user
  const reviewsReceived = reviews.filter((r) => r.reviewedUserId === currentUser.id);

  // Reviews written by current user
  const reviewsWritten = reviews.filter((r) => r.reviewerId === currentUser.id);

  // Eligible completed sessions for review (where current user participated but hasn't reviewed yet)
  const completedClasses = classes.filter(
    (c) =>
      c.status === 'Completed' &&
      (c.enrolledUserIds.includes(currentUser.id) || c.teacherId === currentUser.id) &&
      !reviews.some((r) => r.sessionId === c.id && r.reviewerId === currentUser.id)
  );

  const completedAppointments = appointments.filter(
    (a) =>
      a.status === 'Completed' &&
      (a.learnerId === currentUser.id || a.teacherId === currentUser.id) &&
      !reviews.some((r) => r.sessionId === a.id && r.reviewerId === currentUser.id)
  );

  // Combined eligible completed sessions
  const eligibleSessions = [
    ...completedClasses.map((c) => ({
      id: c.id,
      title: c.title,
      skillName: c.skillName,
      targetUserId: currentUser.id === c.teacherId ? c.enrolledUserIds[0] || '' : c.teacherId,
      targetUserName: currentUser.id === c.teacherId ? 'Student Attendee' : c.teacherName,
    })),
    ...completedAppointments.map((a) => ({
      id: a.id,
      title: `1-on-1: ${a.skillName}`,
      skillName: a.skillName,
      targetUserId: currentUser.id === a.teacherId ? a.learnerId : a.teacherId,
      targetUserName: currentUser.id === a.teacherId ? a.learnerName : a.teacherName,
    })),
  ].filter((s) => s.targetUserId && s.targetUserId !== currentUser.id);

  // Leaderboard calculation
  const teacherLeaderboard = users
    .filter((u) => u.teachingSkills.length > 0 && !u.isSuspended)
    .map((teacher) => {
      const teacherRevs = reviews.filter((r) => r.reviewedUserId === teacher.id);
      const avgRating =
        teacherRevs.length > 0
          ? teacherRevs.reduce((sum, r) => sum + r.rating, 0) / teacherRevs.length
          : teacher.rating;

      return {
        teacher,
        avgRating,
        reviewCount: teacherRevs.length,
        primarySkill: teacher.teachingSkills[0]?.name || 'Mentorship',
        sessionsTaught: teacher.completedSessionsCount,
      };
    })
    .sort((a, b) => b.avgRating * b.reviewCount - a.avgRating * a.reviewCount);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    if (editingReview) {
      editReview(editingReview.id, rating, comment.trim());
      setEditingReview(null);
    } else {
      const chosenSession = eligibleSessions.find((s) => s.id === selectedSessionId) || eligibleSessions[0];
      if (!chosenSession) return;

      submitReview({
        sessionId: chosenSession.id,
        sessionTitle: chosenSession.title,
        reviewerId: currentUser.id,
        reviewerName: currentUser.name,
        reviewerRole: currentUser.role === 'teacher' ? 'teacher' : 'learner',
        reviewedUserId: chosenSession.targetUserId,
        reviewedUserName: chosenSession.targetUserName,
        skillName: chosenSession.skillName,
        rating,
        comment: comment.trim(),
      });
    }

    setIsSubmitModalOpen(false);
    setSelectedSessionId('');
    setComment('');
    setRating(5);
  };

  const handleFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flaggingReviewId || !flagReason.trim()) return;
    flagReview(flaggingReviewId, flagReason.trim());
    setFlaggingReviewId(null);
    setFlagReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Reviews & Teacher Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Verified feedback from completed sessions and community rankings.
          </p>
        </div>

        {eligibleSessions.length > 0 && (
          <button
            onClick={() => {
              setEditingReview(null);
              setSelectedSessionId(eligibleSessions[0]?.id || '');
              setIsSubmitModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Write a Review ({eligibleSessions.length} eligible)</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'received'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Reviews Received ({reviewsReceived.length})
        </button>
        <button
          onClick={() => setActiveTab('written')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'written'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          My Written Feedback ({reviewsWritten.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leaderboard'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Top Teacher Leaderboard</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'received' && (
        <div className="space-y-4">
          {reviewsReceived.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <Star className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                No reviews received yet
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Complete 1-on-1 sessions or host interactive classes to start gathering ratings from students.
              </p>
            </div>
          ) : (
            reviewsReceived.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-neutral-900 dark:text-white">
                        {rev.reviewerName}
                      </strong>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Session: {rev.sessionTitle} · Skill: {rev.skillName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating rating={rev.rating} size="sm" showValue />
                    <button
                      onClick={() => setFlaggingReviewId(rev.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Report inappropriate review"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'written' && (
        <div className="space-y-4">
          {reviewsWritten.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <MessageSquare className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                You have not posted any reviews yet
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Once you finish a lesson, submit feedback here to help peers and teachers improve.
              </p>
            </div>
          ) : (
            reviewsWritten.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                      Reviewed: {rev.reviewedUserName}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {rev.sessionTitle} · {new Date(rev.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating rating={rev.rating} size="sm" showValue />
                    <button
                      onClick={() => {
                        setEditingReview(rev);
                        setRating(rev.rating);
                        setComment(rev.comment);
                        setIsSubmitModalOpen(true);
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                      title="Edit review"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Community Educator Leaderboard
            </h3>
            <p className="text-xs text-neutral-500">
              Rankings calculated dynamically from verified reviews and completed student sessions.
            </p>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {teacherLeaderboard.map((item, idx) => (
              <div
                key={item.teacher.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : idx === 1
                        ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                        : idx === 2
                        ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <Avatar
                    name={item.teacher.name}
                    avatarUrl={item.teacher.avatarUrl}
                    bgColor={item.teacher.avatarBgColor}
                    size="sm"
                    isVerified={item.teacher.isProfileVerified}
                  />

                  <div>
                    <strong className="text-xs font-semibold text-neutral-900 dark:text-white block">
                      {item.teacher.name}
                    </strong>
                    <span className="text-[11px] text-neutral-500">
                      {item.primarySkill} · {item.sessionsTaught} sessions taught
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <StarRating rating={item.avgRating} size="sm" showValue />
                  <span className="text-[11px] text-neutral-400 tabular-nums">
                    ({item.reviewCount} revs)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Submission / Edit Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingReview ? 'Edit Your Review' : 'Submit Session Review'}
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              {!editingReview && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Select Completed Session
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  >
                    {eligibleSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.targetUserName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Rating (1 to 5 Stars)
                </label>
                <StarRating rating={rating} size="lg" interactive onRatingChange={setRating} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Written Feedback
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details of your experience: clarity, preparation, and practical takeaways..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag / Report Review Modal */}
      {flaggingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Report Review to Moderators
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Please specify the reason this review violates community standards.
            </p>

            <form onSubmit={handleFlagSubmit} className="mt-4 space-y-4">
              <div>
                <textarea
                  required
                  rows={3}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="e.g. Inappropriate language, false claims, harassment..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFlaggingReviewId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
