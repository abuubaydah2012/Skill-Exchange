/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentTransaction, RefundStatus } from '../../types';
import { Badge } from '../common/Badge';
import {
  CreditCard,
  DollarSign,
  ArrowDownLeft,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const {
    currentUser,
    payments,
    requestRefund,
  } = useApp();

  const [refundModalTx, setRefundModalTx] = useState<PaymentTransaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  if (!currentUser) return null;

  // Transactions for this user
  const userTransactions = payments.filter((p) => p.userId === currentUser.id);

  // If teacher, calculate simulated earnings
  const isTeacher = currentUser.role === 'teacher';

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalTx || !refundReason.trim()) return;
    requestRefund(refundModalTx.id, refundReason.trim());
    setRefundModalTx(null);
    setRefundReason('');
  };

  const getStatusBadge = (status: PaymentTransaction['status']) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'Refunded':
        return <Badge variant="info">Refunded</Badge>;
      case 'Failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const getRefundBadge = (status: RefundStatus) => {
    switch (status) {
      case 'Requested':
        return <Badge variant="warning">Refund Requested</Badge>;
      case 'Under Review':
        return <Badge variant="warning">Under Review</Badge>;
      case 'Approved':
      case 'Refunded':
        return <Badge variant="info">Refunded</Badge>;
      case 'Rejected':
        return <Badge variant="error">Refund Denied</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sandbox Disclaimer Header */}
      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-semibold">Simulated Payment Sandbox</strong>
          <span>
            This application simulates payment transactions and card charges for demonstration purposes. No real monetary transactions are processed, and no sensitive credit card credentials are stored.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {isTeacher ? 'Earnings & Transactions' : 'Billing & Transaction History'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Review receipts, check refund statuses, and track workshop enrollments.
          </p>
        </div>

        {isTeacher && (
          <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              Total Simulated Earnings
            </span>
            <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              ${currentUser.totalEarnings.toLocaleString()}.00 USD
            </span>
          </div>
        )}
      </div>

      {/* Transaction History Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            Recent Transactions ({userTransactions.length})
          </h2>
          <span className="text-xs text-neutral-500">All amounts in USD</span>
        </div>

        {userTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            No transactions found on this account yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-950/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Session Description</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {userTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500">
                      #{tx.id}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-white max-w-xs truncate">
                      {tx.itemTitle}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                      •••• {tx.paymentMethodLast4}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(tx.status)}
                        {tx.refundStatus !== 'None' && getRefundBadge(tx.refundStatus)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {tx.status === 'Completed' && tx.refundStatus === 'None' && (
                        <button
                          onClick={() => setRefundModalTx(tx)}
                          className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
                        >
                          Request Refund
                        </button>
                      )}
                      {tx.refundReason && (
                        <span
                          className="text-[10px] text-neutral-400 block truncate max-w-[120px]"
                          title={tx.refundReason}
                        >
                          {tx.refundReason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Request Modal */}
      {refundModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Request Lesson Refund
              </h3>
              <button
                onClick={() => setRefundModalTx(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs">
              <span className="text-neutral-500 text-[10px] uppercase font-semibold">Transaction</span>
              <p className="font-semibold text-neutral-900 dark:text-white mt-0.5 truncate">
                {refundModalTx.itemTitle}
              </p>
              <p className="text-neutral-500 font-mono mt-0.5">
                ${refundModalTx.amount.toFixed(2)} USD · Transaction #{refundModalTx.id}
              </p>
            </div>

            <form onSubmit={handleRefundSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason for Refund
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Explain why you are requesting a refund (e.g. session cancellation, instructor no-show, technical difficulties)..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalTx(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Submit Refund Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
