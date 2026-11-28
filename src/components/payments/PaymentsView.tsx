/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentTransaction, RefundStatus } from '../../types';
import { Badge } from '../common/Badge';
import { StatCard } from '../dashboard/StatCard';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  Printer,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { currentUser, payments, requestRefund } = useApp();

  const [refundModalTx, setRefundModalTx] = useState<PaymentTransaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundExplanation, setRefundExplanation] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const [receiptTx, setReceiptTx] = useState<PaymentTransaction | null>(null);

  if (!currentUser) return null;

  const isTeacher = currentUser.role === 'teacher';
  const userTransactions = payments.filter((p) =>
    isTeacher
      ? p.userId === currentUser.id || p.studentId === currentUser.id || p.teacherId === currentUser.id
      : p.userId === currentUser.id || p.studentId === currentUser.id
  );

  // Payment Summary metrics
  const successfulTxs = userTransactions.filter((t) => t.status === 'Completed');
  const pendingTxs = userTransactions.filter((t) => t.status === 'Pending' || t.refundStatus === 'Requested' || t.refundStatus === 'Under Review');
  const refundedTxs = userTransactions.filter((t) => t.status === 'Refunded' || t.refundStatus === 'Refunded');
  const totalDemoPaid = successfulTxs.reduce((sum, t) => sum + t.amount, 0);

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalTx || !refundReason.trim() || isSubmittingRefund) return;
    setIsSubmittingRefund(true);
    try {
      const ok = await requestRefund(
        refundModalTx.id,
        refundReason.trim(),
        refundExplanation.trim()
      );
      if (ok) {
        setRefundModalTx(null);
        setRefundReason('');
        setRefundExplanation('');
      }
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleDownloadReceipt = (tx: PaymentTransaction) => {
    const receiptText = [
      'SKILL EXCHANGE - DEMO PAYMENT RECEIPT (SIMULATED)',
      '================================================',
      `Transaction ID : ${tx.transactionId || tx.id}`,
      `Order ID       : ${tx.orderId || 'N/A'}`,
      `Date           : ${new Date(tx.createdAt).toLocaleString()}`,
      `Status         : ${tx.status} (SIMULATED / DEMO)`,
      `Refund Status  : ${tx.refundStatus}`,
      '------------------------------------------------',
      `Student        : ${tx.studentName || tx.userName}`,
      `Teacher        : ${tx.teacherName || 'Instructor'}`,
      `Course/Lesson  : ${tx.itemTitle}`,
      `Payment Method : ${tx.paymentMethod || tx.paymentMethodLast4} (Demo)`,
      `Amount         : $${tx.amount.toFixed(2)} ${tx.currency}`,
      '================================================',
      'Notice: Demo Payment Sandbox. No real money charged.',
    ].join('\n');

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tx.transactionId || tx.id}-demo-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: PaymentTransaction['status']) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'Refunded':
        return <Badge variant="info">Refunded</Badge>;
      case 'Failed':
        return <Badge variant="error">Failed</Badge>;
      case 'Cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
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
      case 'Processing':
        return <Badge variant="info">Processing</Badge>;
      case 'Approved':
      case 'Refunded':
        return <Badge variant="info">Refunded</Badge>;
      case 'Rejected':
        return <Badge variant="error">Refund Rejected</Badge>;
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
          <strong className="block font-semibold">
            Demo Payment Sandbox — All transactions are simulated. No real money is charged or transferred.
          </strong>
          <span>
            This academic demo simulates Visa, Mastercard, PayPal, bKash, and Nagad checkouts and refunds in MongoDB without collecting or storing real banking credentials.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {isTeacher ? 'Earnings & Demo Transactions' : 'Billing & Demo Payment History'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Review simulated receipts, track refund requests, and verify workshop enrollments.
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

      {/* Payment Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Demo Amount Paid"
          value={`$${totalDemoPaid.toFixed(2)} USD`}
          subValue="Simulated completed"
          icon={DollarSign}
        />
        <StatCard
          label="Successful Transactions"
          value={successfulTxs.length}
          subValue="Confirmed enrollments"
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending / In Review"
          value={pendingTxs.length}
          subValue="Awaiting action"
          icon={Clock}
        />
        <StatCard
          label="Refunded Transactions"
          value={refundedTxs.length}
          subValue="Simulated refunds"
          icon={RotateCcw}
        />
      </div>

      {/* Transaction History Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            Recent Transactions ({userTransactions.length})
          </h2>
          <span className="text-xs text-neutral-500">All amounts in USD (Demo)</span>
        </div>

        {userTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            No simulated transactions found on this account yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-950/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Course / Lesson</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {userTransactions.map((tx) => {
                  const isBuyer = (tx.studentId || tx.userId) === currentUser.id;
                  return (
                    <tr key={tx.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                      <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-white max-w-[200px] truncate">
                        {tx.itemTitle}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {tx.teacherName || 'Instructor'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {tx.transactionId || `#${tx.id}`}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300 font-medium whitespace-nowrap">
                        {tx.paymentMethod || `•••• ${tx.paymentMethodLast4}`}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(tx.status)}
                          {tx.refundStatus !== 'None' && getRefundBadge(tx.refundStatus)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReceiptTx(tx)}
                            className="text-xs text-neutral-700 dark:text-neutral-300 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>

                          {isBuyer && tx.status === 'Completed' && tx.refundStatus === 'None' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundModalTx(tx);
                                setRefundReason('');
                                setRefundExplanation('');
                              }}
                              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                            >
                              Request Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details / Receipt Modal */}
      {receiptTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Demo Transaction Receipt
                </h3>
                <p className="text-[11px] text-neutral-500">Simulated Payment Record</p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptTx(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                <span className="text-neutral-500">Transaction ID:</span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white text-right">
                  {receiptTx.transactionId || receiptTx.id}
                </span>
                <span className="text-neutral-500">Order ID:</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300 text-right">
                  {receiptTx.orderId || 'N/A'}
                </span>
                <span className="text-neutral-500">Student:</span>
                <span className="font-medium text-neutral-900 dark:text-white text-right">
                  {receiptTx.studentName || receiptTx.userName}
                </span>
                <span className="text-neutral-500">Teacher:</span>
                <span className="font-medium text-neutral-900 dark:text-white text-right">
                  {receiptTx.teacherName || 'Instructor'}
                </span>
                <span className="text-neutral-500">Course / Lesson:</span>
                <span className="font-medium text-neutral-900 dark:text-white text-right">
                  {receiptTx.itemTitle}
                </span>
                <span className="text-neutral-500">Payment Method:</span>
                <span className="font-semibold text-neutral-900 dark:text-white text-right">
                  {receiptTx.paymentMethod || `•••• ${receiptTx.paymentMethodLast4}`} (Demo)
                </span>
                <span className="text-neutral-500">Date:</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-right">
                  {new Date(receiptTx.createdAt).toLocaleString()}
                </span>
                <span className="text-neutral-500">Status:</span>
                <span className="text-right font-semibold text-neutral-900 dark:text-white">
                  {receiptTx.status}
                </span>
                {receiptTx.refundStatus !== 'None' && (
                  <>
                    <span className="text-neutral-500">Refund Status:</span>
                    <span className="text-right font-semibold text-sky-600 dark:text-sky-400">
                      {receiptTx.refundStatus}
                    </span>
                  </>
                )}
                <span className="text-neutral-500 font-semibold pt-1 border-t border-neutral-200 dark:border-neutral-800">
                  Amount:
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white text-right pt-1 border-t border-neutral-200 dark:border-neutral-800">
                  ${receiptTx.amount.toFixed(2)} {receiptTx.currency}
                </span>
              </div>

              {receiptTx.adminResponse && (
                <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <strong>Admin Response:</strong> {receiptTx.adminResponse}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(receiptTx)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setReceiptTx(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {refundModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Request Demo Refund
              </h3>
              <button
                type="button"
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
                ${refundModalTx.amount.toFixed(2)} USD · {refundModalTx.transactionId || `#${refundModalTx.id}`}
              </p>
            </div>

            <form onSubmit={handleRefundSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Refund Reason
                </label>
                <select
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  <option value="">Select a reason...</option>
                  <option value="Schedule conflict / Unable to attend">Schedule conflict / Unable to attend</option>
                  <option value="Session cancelled or rescheduled">Session cancelled or rescheduled</option>
                  <option value="Technical difficulties">Technical difficulties</option>
                  <option value="Course did not match description">Course did not match description</option>
                  <option value="Academic Demo Test Case">Academic Demo Test Case</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Additional Explanation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={refundExplanation}
                  onChange={(e) => setRefundExplanation(e.target.value)}
                  placeholder="Provide any extra context for the admin reviewer..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingRefund}
                  onClick={() => setRefundModalTx(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmittingRefund ? 'Submitting...' : 'Submit Refund Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
