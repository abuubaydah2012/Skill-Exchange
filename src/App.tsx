/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';

// Auth
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';

// Dashboards
import { DashboardRouter } from './components/dashboard/DashboardRouter';
import { AdminDashboard } from './components/dashboard/AdminDashboard';

// Features
import { DiscoveryView } from './components/discovery/DiscoveryView';
import { SmartMatchesView } from './components/matching/SmartMatchesView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { ClassesView } from './components/sessions/ClassesView';
import { MessagesView } from './components/messaging/MessagesView';
import { CertificatesView } from './components/certificates/CertificatesView';
import { SkillsView } from './components/skills/SkillsView';
import { ReviewsView } from './components/reviews/ReviewsView';
import { PaymentsView } from './components/payments/PaymentsView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ComplaintsView } from './components/complaints/ComplaintsView';
import { ProfileView } from './components/profile/ProfileView';
import { SettingsView } from './components/settings/SettingsView';

// Admin Features
import { AdminUsersView } from './components/admin/AdminUsersView';
import { AdminVerificationsView } from './components/admin/AdminVerificationsView';
import { AdminComplaintsView } from './components/admin/AdminComplaintsView';
import { AdminModerationView } from './components/admin/AdminModerationView';
import { AdminAnnouncementsView } from './components/admin/AdminAnnouncementsView';
import { AdminAnalyticsView } from './components/admin/AdminAnalyticsView';

// Common
import { NotFoundView } from './components/common/NotFoundView';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          {/* Root Redirect to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Authenticated Application Shell Routes */}
          <Route element={<AppShell requireAuth={true} />}>
            {/* General & Role-Adaptive Dashboards */}
            <Route path="/dashboard" element={<DashboardRouter />} />

            {/* Discovery & Smart Matching */}
            <Route path="/discover" element={<DiscoveryView />} />
            <Route path="/matches" element={<SmartMatchesView />} />

            {/* Teaching & Learning Management */}
            <Route path="/skills" element={<SkillsView />} />
            <Route path="/certificates" element={<CertificatesView />} />

            {/* Appointments & Live Sessions */}
            <Route path="/appointments" element={<AppointmentsView />} />
            <Route path="/classes" element={<ClassesView />} />

            {/* Communications & Feedback */}
            <Route path="/messages" element={<MessagesView />} />
            <Route path="/notifications" element={<NotificationsView />} />
            <Route path="/reviews" element={<ReviewsView />} />

            {/* Financials & Conduct */}
            <Route path="/payments" element={<PaymentsView />} />
            <Route path="/complaints" element={<ComplaintsView />} />

            {/* User Profile & Settings */}
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/profile/:id" element={<ProfileView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Route>

          {/* Protected Administrative Routes (Frontend Role Guard: admin required) */}
          <Route element={<AppShell requireAuth={true} requiredRole="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsersView />} />
            <Route path="/admin/verifications" element={<AdminVerificationsView />} />
            <Route path="/admin/complaints" element={<AdminComplaintsView />} />
            <Route path="/admin/moderation" element={<AdminModerationView />} />
            <Route path="/admin/announcements" element={<AdminAnnouncementsView />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsView />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<AppShell requireAuth={false} />}>
            <Route path="*" element={<NotFoundView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
