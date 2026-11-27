/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';
import { ShieldAlert } from 'lucide-react';

interface AppShellProps {
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'teacher' | 'learner';
}

export const AppShell: React.FC<AppShellProps> = ({
  requireAuth = true,
  requiredRole,
}) => {
  const { currentUser, isAuthLoading } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  if (requireAuth && isAuthLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Verifying session...</p>
      </div>
    );
  }

  if (requireAuth && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Frontend role guard (as requested: "Do not allow a learner to access administrative workflows by manually entering an admin URL. Clearly treat frontend role protection as a demo feature, not production-grade security.")
  if (requiredRole && currentUser && currentUser.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
          Access Restricted
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-md">
          This area requires the <strong>{requiredRole.toUpperCase()}</strong> role. Your current active profile is logged in as a <strong>{currentUser.role.toUpperCase()}</strong>.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <a
            href={currentUser.role === 'admin' ? '/admin' : '/dashboard'}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Return to My Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          isOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
