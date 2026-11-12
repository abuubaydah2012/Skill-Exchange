/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { StarRating } from '../common/StarRating';
import { Badge } from '../common/Badge';
import { ShieldAlert, CheckCircle2, Trash2, Star, MessageSquare } from 'lucide-react';

export const AdminModerationView: React.FC = () => {
  const { reviews, moderateReview } = useApp();

  const flaggedReviews = reviews.filter((r) => r.isFlagged);
  const normalReviews = reviews.filter((r) => !r.isFlagged);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Review Moderation Queue
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Investigate reported reviews for defamation, vulgar language, or fraudulent feedback.
        </p>
      </div>

      {/* Flagged reviews queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Flagged by Community ({flaggedReviews.length})</span>
          </h2>
        </div>

        {flaggedReviews.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
            No flagged reviews in the queue. All community feedback is compliant!
          </div>
        ) : (
          flaggedReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-neutral-900 dark:text-white">
                      Reviewer: {rev.reviewerName} → Reviewed: {rev.reviewedUserName}
                    </strong>
                    <Badge variant="error">Flagged</Badge>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Session: {rev.sessionTitle} · Skill: {rev.skillName} · {new Date(rev.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <StarRating rating={rev.rating} size="sm" showValue />
              </div>

              {rev.flagReason && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <strong>Report Reason:</strong> {rev.flagReason}
                </div>
              )}

              <p className="text-xs text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 leading-relaxed">
                &ldquo;{rev.comment}&rdquo;
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => moderateReview(rev.id, 'keep')}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dismiss Flag (Approve Review)</span>
                </button>
                <button
                  onClick={() => moderateReview(rev.id, 'delete')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Inappropriate Review</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Approved Reviews */}
      <div className="space-y-4 pt-6">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neutral-500" />
          <span>Recent Community Feedback ({normalReviews.length})</span>
        </h2>

        <div className="space-y-3">
          {normalReviews.slice(0, 4).map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {rev.reviewerName}
                  </span>
                  <span className="text-neutral-400">→</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {rev.reviewedUserName}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-1">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="shrink-0 text-right">
                <StarRating rating={rev.rating} size="sm" showValue />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
