/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  CalendarDays,
  Video,
  MessageSquare,
  Award,
  Star,
  CreditCard,
  Bell,
  User,
  Settings,
  BookOpen,
  Users,
  ShieldAlert,
  SlidersHorizontal,
  Megaphone,
  BarChart3,
  CheckCircle,
  RotateCcw,
  AlertCircle,
  FileBadge,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { currentUser, messages, notifications, resetDemoData } = useApp();
  const location = useLocation();

  if (!currentUser) return null;

  const role = currentUser.role;

  // Calculate unread counts
  const unreadMessagesCount = messages.filter(
    (m) => m.receiverId === currentUser.id && !m.isRead
  ).length;

  const unreadNotificationsCount = notifications.filter(
    (n) => n.userId === currentUser.id && !n.isRead
  ).length;

  interface NavItem {
    label: string;
    path: string;
    icon: React.ElementType;
    badgeCount?: number;
  }

  // Learner navigation
  const learnerNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Discover Skills', path: '/discover', icon: Compass },
    { label: 'Recommended Matches', path: '/matches', icon: Sparkles },
    { label: 'Appointments', path: '/appointments', icon: CalendarDays },
    { label: 'My Sessions', path: '/classes', icon: Video },
    { label: 'Messages', path: '/messages', icon: MessageSquare, badgeCount: unreadMessagesCount },
    { label: 'Certificates', path: '/certificates', icon: Award },
    { label: 'Reviews', path: '/reviews', icon: Star },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Notifications', path: '/notifications', icon: Bell, badgeCount: unreadNotificationsCount },
    { label: 'My Profile', path: `/profile/${currentUser.id}`, icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  // Teacher navigation
  const teacherNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Teaching Skills', path: '/skills', icon: BookOpen },
    { label: 'Student Requests', path: '/appointments', icon: CalendarDays },
    { label: 'My Classes', path: '/classes', icon: Video },
    { label: 'Recommended Matches', path: '/matches', icon: Sparkles },
    { label: 'Messages', path: '/messages', icon: MessageSquare, badgeCount: unreadMessagesCount },
    { label: 'Certificate Management', path: '/certificates', icon: Award },
    { label: 'Reviews', path: '/reviews', icon: Star },
    { label: 'Earnings & Payments', path: '/payments', icon: CreditCard },
    { label: 'Notifications', path: '/notifications', icon: Bell, badgeCount: unreadNotificationsCount },
    { label: 'My Profile', path: `/profile/${currentUser.id}`, icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  // Admin navigation
  const adminNavItems: NavItem[] = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Verification Center', path: '/admin/verifications', icon: CheckCircle },
    { label: 'Reports & Complaints', path: '/admin/complaints', icon: AlertCircle },
    { label: 'Review Moderation', path: '/admin/moderation', icon: ShieldAlert },
    { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    { label: 'Platform Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Live Marketplace', path: '/discover', icon: Compass },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const currentNavItems =
    role === 'admin' ? adminNavItems : role === 'teacher' ? teacherNavItems : learnerNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            {role.toUpperCase()} MENU
          </div>

          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path) && item.path !== '/profile');

            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive: linkActive }) => {
                  const active = isActive || linkActive;
                  return `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                    active
                      ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`;
                }}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-500 rounded-full tabular-nums">
                    {item.badgeCount}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          {/* Quick link to switch between learn & teach */}
          {role !== 'admin' && (
            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                <span>Free Skill Swap</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-tight">
                Teach a skill, earn hours, and redeem for free 1-on-1 lessons.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={resetDemoData}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Reset localStorage demo data back to seed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </aside>
    </>
  );
};
