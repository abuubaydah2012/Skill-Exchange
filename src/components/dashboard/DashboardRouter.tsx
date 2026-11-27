/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LearnerDashboard } from './LearnerDashboard';
import { TeacherDashboard } from './TeacherDashboard';

export const DashboardRouter: React.FC = () => {
  const { currentUser, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (currentUser.role === 'teacher') {
    return <TeacherDashboard />;
  }

  return <LearnerDashboard />;
};
