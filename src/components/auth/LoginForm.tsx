/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { OtpModal, ForgotPasswordModal, LockoutModal } from './AuthModals';
import { KeyRound, ShieldAlert, ArrowRight, UserCheck, Sparkles, Check, Sun, Moon } from 'lucide-react';
import { UserRole } from '../../types';

export const LoginForm: React.FC = () => {
  const { login, loginWithDemoRole, isAccountLocked, currentUser, theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('learner@skillexchange.io');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showLockoutModal, setShowLockoutModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.requiresOtp) {
          setShowOtpModal(true);
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrorMessage(result.error || 'Failed to sign in.');
        if (result.error?.includes('locked')) {
          setShowLockoutModal(true);
        }
      }
    } catch {
      setErrorMessage('An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    loginWithDemoRole(role);
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const locked = isAccountLocked(email);

  return (
    <div className="relative min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          aria-label="Toggle color mode"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xl tracking-tight shadow-md">
            SX
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Sign in to Skill Exchange
        </h2>
        <p className="mt-1 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Learn new skills, teach what you love, and grow with peers.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Demo Fast Login Strip */}
        <div className="mb-6 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Demo Accounts (1-Click Login)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('learner')}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-sky-600 dark:text-sky-400">Learner</div>
              <div className="text-[10px] text-neutral-500 truncate">Elena Rostova</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('teacher')}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">Teacher</div>
              <div className="text-[10px] text-neutral-500 truncate">Marcus Vance</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-indigo-600 dark:text-indigo-400">Admin</div>
              <div className="text-[10px] text-neutral-500 truncate">Sarah Jenkins</div>
            </button>
          </div>
        </div>

        {/* Manual Credentials Box */}
        <div className="bg-white dark:bg-neutral-900 py-8 px-6 sm:px-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
                {locked && (
                  <button
                    type="button"
                    onClick={() => setShowLockoutModal(true)}
                    className="block font-semibold underline mt-1 cursor-pointer"
                  >
                    Open Account Recovery
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Demo password: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">password123</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || locked}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer ${
                locked
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100'
              }`}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Don&apos;t have an account yet?{' '}
            </span>
            <Link
              to="/register"
              className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline"
            >
              Register here
            </Link>
          </div>
        </div>
      </div>

      {showOtpModal && (
        <OtpModal
          onSuccess={() => {
            setShowOtpModal(false);
            navigate('/dashboard');
          }}
        />
      )}

      {showForgotModal && (
        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
        />
      )}

      {showLockoutModal && (
        <LockoutModal
          email={email}
          isOpen={showLockoutModal}
          onClose={() => setShowLockoutModal(false)}
        />
      )}
    </div>
  );
};
