/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KeyRound, ShieldAlert, X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface OtpModalProps {
  onSuccess: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({ onSuccess }) => {
  const { otpState, verifyOtp, resendOtp, cancelOtp } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!otpState) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    const ok = verifyOtp(code);
    if (ok) {
      onSuccess();
    } else {
      setError('Invalid or expired code. Please check the simulated demo code.');
    }
  };

  const handleResend = () => {
    const newCode = resendOtp();
    setCode(newCode);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <button
            onClick={cancelOtp}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-4">
          Two-Factor Authentication
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          A simulated 6-digit one-time passcode was generated for <strong>{otpState.pendingEmail}</strong>.
        </p>

        {/* Demo Hint Box */}
        <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
              Simulated Demo Passcode
            </span>
            <span className="font-mono text-base font-bold text-neutral-900 dark:text-white tracking-widest">
              {otpState.code}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCode(otpState.code)}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
          >
            Fill Code
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="000000"
              className="w-full text-center tracking-widest font-mono text-xl py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              autoFocus
            />
            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-neutral-500">Expires in 3 minutes</span>
            <button
              type="button"
              onClick={handleResend}
              className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300 hover:underline font-medium cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resend Code
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer mt-4"
          >
            Verify & Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { requestPasswordReset } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const ok = await requestPasswordReset(email);
    if (ok) {
      setSubmitted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Reset Password
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-4 text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Password Reset Dispatched
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
              In this simulated environment, demo accounts use password <strong>password123</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Enter the email associated with your account to receive simulated recovery instructions.
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="learner@skillexchange.io"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Send Instructions
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface LockoutModalProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LockoutModal: React.FC<LockoutModalProps> = ({
  email,
  isOpen,
  onClose,
}) => {
  const { unlockAccount } = useApp();

  if (!isOpen) return null;

  const handleUnlock = () => {
    unlockAccount(email);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-8">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          Account Temporarily Locked
        </h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
          5 consecutive unsuccessful login attempts were recorded for <strong>{email}</strong>. For security, access has been restricted.
        </p>
        <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
          In production, an automated unlock link is dispatched to your registered email. In this demonstration, you can perform simulated account restoration instantly below.
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleUnlock}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
          >
            Simulate Instant Unlock
          </button>
        </div>
      </div>
    </div>
  );
};
