/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  KeyRound,
  Bell,
  Sun,
  Moon,
  Eye,
  UserX,
  Trash2,
  LogOut,
  RotateCcw,
  Check,
  AlertTriangle,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    theme,
    toggleTheme,
    updateProfile,
    logout,
    resetDemoData,
    addToast,
  } = useApp();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState('');

  // 2FA state
  const [twoFactor, setTwoFactor] = useState(currentUser?.twoFactorEnabled || false);

  // Profile visibility
  const [visibility, setVisibility] = useState(
    currentUser?.profileVisibility || 'public'
  );

  // Notification preferences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [appointmentNotifs, setAppointmentNotifs] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);

  if (!currentUser) return null;

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordFeedback('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback('New passwords do not match.');
      return;
    }
    setPasswordFeedback('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    addToast('success', 'Password Updated', 'Simulated password change was successfully recorded.');
  };

  const handle2faToggle = () => {
    const nextVal = !twoFactor;
    setTwoFactor(nextVal);
    updateProfile({ twoFactorEnabled: nextVal });
    addToast(
      'info',
      'Two-Factor Security',
      nextVal ? '2FA code verification enabled on login.' : '2FA disabled.'
    );
  };

  const handleVisibilityChange = (val: 'public' | 'members-only' | 'private') => {
    setVisibility(val);
    updateProfile({ profileVisibility: val });
    addToast('success', 'Visibility Saved', `Profile visibility set to ${val}.`);
  };

  const handleDeleteAccountSimulation = () => {
    addToast(
      'warning',
      'Deletion Request Submitted',
      'In a production environment, your account would be scheduled for purge within 30 days. For demo testing, you can use Reset Demo Data anytime.'
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Account Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Configure security, preferences, appearance, and profile visibility.
        </p>
      </div>

      {/* Section 1: Security & Two-Factor Authentication */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Security & Authentication</span>
        </h2>

        {/* 2FA Toggle */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <strong className="text-xs font-semibold text-neutral-900 dark:text-white block">
              Two-Factor Authentication (2FA) via 6-Digit OTP
            </strong>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Requires a simulated 6-digit one-time passcode upon every login.
            </p>
          </div>
          <button
            type="button"
            onClick={handle2faToggle}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              twoFactor ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                twoFactor ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Password Change Simulation Form */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
            <span>Change Account Password</span>
          </h3>

          {passwordFeedback && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-2 font-medium">
              {passwordFeedback}
            </p>
          )}

          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 2: Appearance & Theme */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-sky-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>Interface Appearance & Theme</span>
        </h2>

        <div className="flex items-center justify-between text-xs">
          <div>
            <strong className="text-neutral-900 dark:text-white block font-semibold">
              Color Palette Theme ({theme === 'dark' ? 'Dark Mode' : 'Light Mode'})
            </strong>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              High contrast WCAG AA compliant theme, persisted in local browser storage.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3.5 py-1.5 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>

      {/* Section 3: Privacy & Profile Visibility */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-neutral-500" />
          <span>Profile Privacy</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {(['public', 'members-only', 'private'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleVisibilityChange(opt)}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                visibility === opt
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 font-bold'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <span className="capitalize block text-neutral-900 dark:text-white">
                {opt}
              </span>
              <span className="text-[10px] text-neutral-500 font-normal block mt-0.5 leading-tight">
                {opt === 'public'
                  ? 'Visible on public discovery directory'
                  : opt === 'members-only'
                  ? 'Only logged-in members can discover'
                  : 'Hidden from discovery search'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 4: Notification Preferences */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3 text-xs">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-neutral-500" />
          <span>Notification Alerts</span>
        </h2>

        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer">
          <span className="text-neutral-800 dark:text-neutral-200 font-medium">
            Email Alerts for Session Bookings & Approvals
          </span>
          <input
            type="checkbox"
            checked={appointmentNotifs}
            onChange={(e) => setAppointmentNotifs(e.target.checked)}
            className="rounded"
          />
        </label>

        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer">
          <span className="text-neutral-800 dark:text-neutral-200 font-medium">
            Direct Messaging Notifications
          </span>
          <input
            type="checkbox"
            checked={messageNotifs}
            onChange={(e) => setMessageNotifs(e.target.checked)}
            className="rounded"
          />
        </label>
      </div>

      {/* Section 5: Data Management & Danger Zone */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Platform Data & Account Actions</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-rose-100 dark:border-rose-950/60 text-xs">
          <div>
            <strong className="text-neutral-900 dark:text-white block font-semibold">
              Restore Demo Dataset
            </strong>
            <p className="text-[11px] text-neutral-500">
              Clear your browser localStorage and reload original 15 users, 25 skills, and clean state.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDemoData}
            className="px-3.5 py-2 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-rose-100 dark:border-rose-950/60 text-xs">
          <div>
            <strong className="text-rose-600 dark:text-rose-400 block font-semibold">
              Request Account Deletion
            </strong>
            <p className="text-[11px] text-neutral-500">
              Initiates simulated permanent deletion workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccountSimulation}
            className="px-3.5 py-2 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 cursor-pointer shrink-0"
          >
            Simulate Deletion
          </button>
        </div>
      </div>
    </div>
  );
};
