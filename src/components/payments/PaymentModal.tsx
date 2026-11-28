/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassSession, DemoPaymentMethod, PaymentTransaction } from '../../types';
import { Badge } from '../common/Badge';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  FlaskConical,
  Loader2,
  Printer,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

interface PaymentModalProps {
  session: ClassSession;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const PAYMENT_METHODS: {
  id: DemoPaymentMethod;
  label: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
}[] = [
  { id: 'Visa', label: 'Visa', subtitle: 'Simulated Card', badge: 'VISA', icon: CreditCard },
  { id: 'Mastercard', label: 'Mastercard', subtitle: 'Simulated Card', badge: 'MC', icon: CreditCard },
  { id: 'PayPal', label: 'PayPal', subtitle: 'Simulated Wallet', badge: 'PP', icon: Wallet },
  { id: 'bKash', label: 'bKash', subtitle: 'Simulated Mobile Banking', badge: 'bKash', icon: Smartphone },
  { id: 'Nagad', label: 'Nagad', subtitle: 'Simulated Mobile Banking', badge: 'Nagad', icon: Smartphone },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  session,
  isOpen,
  onSuccess,
  onClose,
}) => {
  const { processDemoCheckout } = useApp();

  const [selectedMethod, setSelectedMethod] = useState<DemoPaymentMethod>('Visa');
  const [demoOutcome, setDemoOutcome] = useState<'Success' | 'Failed' | 'Cancelled'>('Success');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultTx, setResultTx] = useState<PaymentTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setErrorMessage('');
    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 750));
      const res = await processDemoCheckout(session.id, selectedMethod, demoOutcome);
      if (res.transaction) {
        setResultTx(res.transaction);
        if (res.success) {
          onSuccess();
        }
      } else {
        setErrorMessage(res.message || 'Demo checkout could not be completed.');
      }
    } finally {
      setIsProcessing(false);
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
      '------------------------------------------------',
      `Student        : ${tx.studentName || tx.userName}`,
      `Teacher        : ${tx.teacherName || session.teacherName}`,
      `Course/Lesson  : ${tx.itemTitle}`,
      `Payment Method : ${tx.paymentMethod || selectedMethod} (Demo)`,
      `Amount Paid    : $${tx.amount.toFixed(2)} ${tx.currency}`,
      '================================================',
      'Notice: Academic/Demo Sandbox. No real money charged.',
    ].join('\n');

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tx.transactionId || tx.id}-demo-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg my-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Demo Payment Checkout
                </h3>
                <Badge variant="info">Simulated</Badge>
              </div>
              <p className="text-[11px] text-neutral-500">
                Academic sandbox — no real money or banking credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Result Screen (Receipt or Failed/Cancelled) */}
        {resultTx ? (
          <div className="mt-4 space-y-4">
            {resultTx.status === 'Completed' ? (
              <>
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100">
                      Demo Payment Successful — Enrollment Confirmed
                    </h4>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                      This simulated transaction has been saved to MongoDB and your seat is reserved.
                    </p>
                  </div>
                </div>

                {/* Printable Demo Receipt */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Demo Payment Receipt
                    </span>
                    <Badge variant="success">Completed (Demo)</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <span className="text-neutral-500">Transaction ID:</span>
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white text-right">
                      {resultTx.transactionId || resultTx.id}
                    </span>
                    <span className="text-neutral-500">Order ID:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300 text-right">
                      {resultTx.orderId}
                    </span>
                    <span className="text-neutral-500">Student:</span>
                    <span className="font-medium text-neutral-900 dark:text-white text-right">
                      {resultTx.studentName || resultTx.userName}
                    </span>
                    <span className="text-neutral-500">Teacher:</span>
                    <span className="font-medium text-neutral-900 dark:text-white text-right">
                      {resultTx.teacherName || session.teacherName}
                    </span>
                    <span className="text-neutral-500">Course / Workshop:</span>
                    <span className="font-medium text-neutral-900 dark:text-white text-right truncate">
                      {resultTx.itemTitle}
                    </span>
                    <span className="text-neutral-500">Payment Method:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white text-right">
                      {resultTx.paymentMethod || selectedMethod} (Demo)
                    </span>
                    <span className="text-neutral-500">Date:</span>
                    <span className="text-neutral-700 dark:text-neutral-300 text-right">
                      {new Date(resultTx.createdAt).toLocaleString()}
                    </span>
                    <span className="text-neutral-500 font-semibold pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      Amount Paid:
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      ${resultTx.amount.toFixed(2)} {resultTx.currency}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(resultTx)}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-rose-900 dark:text-rose-100">
                      Simulated Payment {resultTx.status}
                    </h4>
                    <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                      Transaction {resultTx.transactionId} was recorded as <strong>{resultTx.status}</strong>. No enrollment or course access was granted.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResultTx(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-lg cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handlePayNow} className="mt-4 space-y-4">
            {/* Order Summary */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1.5">
              <div className="text-neutral-500 text-[10px] uppercase font-semibold">
                Order Summary
              </div>
              <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
                {session.title}
              </h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                {session.description}
              </p>
              <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Instructor: <strong className="text-neutral-900 dark:text-white">{session.teacherName}</strong>
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                  ${session.price.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Simulated Payment Methods */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Select Simulated Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/10 ring-1 ring-neutral-900 dark:ring-white'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                        <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                          {m.badge}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-white mt-1.5">
                        {m.label}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">{m.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explicit Academic Demo Testing Controls */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Demo Testing Controls (Academic Simulation)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['Success', 'Failed', 'Cancelled'] as const).map((outcome) => (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => setDemoOutcome(outcome)}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                      demoOutcome === outcome
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    Simulate {outcome}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Final Payable & Actions */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-neutral-500 block text-[10px]">Final Payable (Demo)</span>
                <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                  ${session.price.toFixed(2)} USD · {selectedMethod}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Simulating...</span>
                    </>
                  ) : (
                    <span>Pay Now (Demo)</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
