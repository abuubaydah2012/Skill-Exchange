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
  const { currentUser } = useApp();

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
