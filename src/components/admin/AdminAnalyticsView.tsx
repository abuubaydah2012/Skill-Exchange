/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../dashboard/StatCard';
import { Badge } from '../common/Badge';
import {
  BarChart3,
  CreditCard,
  DollarSign,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
} from 'lucide-react';

export const AdminAnalyticsView: React.FC = () => {
  const { users, classes, payments, reviewRefundDecision } = useApp();

  const totalVolume = payments
    .filter((p) => p.status === 'Completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingRefunds = payments.filter((p) => p.refundStatus === 'Requested');
  const processedRefunds = payments.filter((p) => p.refundStatus === 'Refunded');

  // Category counts
  const categoryCount: Record<string, number> = {};
  users.forEach((u) => {
    u.teachingSkills.forEach((s) => {
      categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Platform Analytics & Financial Sandbox
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Monitor simulated transaction volume, manage refund approvals, and observe category distribution.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Gross Simulated Volume"
          value={`$${totalVolume.toFixed(2)} USD`}
          subValue={`${payments.length} transactions`}
          icon={DollarSign}
        />
        <StatCard
          label="Pending Refunds"
          value={pendingRefunds.length}
          subValue="Awaiting admin action"
          icon={RotateCcw}
        />
        <StatCard
          label="Refunded Total"
          value={`$${processedRefunds.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}`}
          subValue={`${processedRefunds.length} cases processed`}
          icon={CreditCard}
        />
        <StatCard
          label="Live Workshop Classes"
          value={classes.filter((c) => c.status === 'Scheduled').length}
          subValue="Currently open for enrollment"
          icon={Calendar}
        />
      </div>

      {/* Refund Request Review Console */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <span>Refund Review Console ({pendingRefunds.length} Pending)</span>
          </h2>
          <span className="text-xs text-neutral-500">Requires administrative ruling</span>
        </div>

        {pendingRefunds.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
            No pending refund requests. All claims adjudicated!
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRefunds.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="font-semibold text-neutral-900 dark:text-white">
                      Tx #{tx.id} · {tx.userName}
                    </strong>
                    <Badge variant="warning">Refund Requested</Badge>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 mt-1">
                    Item: <strong>{tx.itemTitle}</strong> (${tx.amount.toFixed(2)} USD)
                  </p>
                  {tx.refundReason && (
                    <p className="text-neutral-500 italic mt-0.5">
                      Reason: &ldquo;{tx.refundReason}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => reviewRefundDecision(tx.id, 'Approved')}
                    className="px-3.5 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Refund</span>
                  </button>
                  <button
                    onClick={() => reviewRefundDecision(tx.id, 'Rejected')}
                    className="px-3.5 py-1.5 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Claim</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skill Categories Distribution Grid */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <span>Category Repertoire Distribution</span>
          </h2>
          <p className="text-xs text-neutral-500">
            Number of registered teaching skills per subject category.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {Object.entries(categoryCount).map(([cat, count]) => (
            <div
              key={cat}
              className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between"
            >
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {cat}
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                {count} skills
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
